# nanoinfer: a C++20 edge inference engine with a CUDA int8 backend

<div class="meta"><span><b>Stack</b> C++20, ARM NEON, CUDA, Triton, cuBLAS, cuDNN, ONNX Runtime</span><span><b>Role</b> Solo</span></div>

<div class="doclinks"><a class="btn btn--solid" href="https://github.com/AshrithaG/nanoinfer" target="_blank" rel="noopener">Code on GitHub</a></div>

<figure><img src="images/hero.png" alt=""><figcaption>Latency and thread scaling against ONNX Runtime. Apple M4 Pro, single inference, median of 600 timed runs at the best thread count for each configuration.</figcaption></figure>

## The short version

I wrote a neural network inference engine from scratch in C++20, first for ARM edge targets and then
with a CUDA int8 backend, and benchmarked every kernel against the production libraries it would have
to replace. The CPU engine lands at parity with ONNX Runtime on dense convolution. The CUDA int8 GEMM
looked ahead of cuBLAS up to n=1024 until I rewrote it in Triton and benchmarked everything in one process:
I had been measuring against a slow path through cuBLAS, which in its preferred layout is 4.5x faster than my
kernel. The Triton version matches it. Where my code loses, the write-up says so and explains why.

<div class="stats"><div class="stat"><b>0.99x</b><span>of ONNX Runtime on the dense CNN</span></div><div class="stat"><b>122.8 TOPS</b><span>int8 CUDA GEMM peak</span></div><div class="stat"><b>540 TOPS</b><span>int8 Triton GEMM, matching cuBLAS</span></div><div class="stat"><b>37 to 77%</b><span>less activation memory</span></div></div>

## Part one: the CPU engine

The design goal was zero allocation during a forward pass. I build a liveness graph over every
intermediate tensor before the first inference, then pack them into a single arena where buffers whose
lifetimes do not overlap share storage.

- **Convolution** through im2col plus SGEMM, with fused bias and activation epilogues so the output is
  written once rather than three times.
- **Depthwise convolution** hand-vectorised with ARM NEON intrinsics, since im2col is the wrong shape
  for a per-channel kernel.
- **Memory planning** by liveness analysis, which is where the 37 to 77% activation-memory reduction
  comes from. No allocator is called inside the forward pass.

| Workload | nanoinfer vs ONNX Runtime |
|---|---|
| Dense CNN | **0.99x** |
| Depthwise-heavy CNN | 0.60x to 0.77x |
| Activation memory | **37 to 77% lower** |

Parity on the dense path is the result I care about. The depthwise gap is real and I did not hide it:
ONNX Runtime dispatches to a hand-tuned microkernel library there, and my NEON path is one engineer's
worth of tuning against many.

## Part two: the CUDA int8 GEMM ladder

I wrote four progressively better int8 matrix multiply kernels so the speedup of each step was
attributable to one change.

1. **Naive** tiled int8 with int32 accumulation.
2. **dp4a**, packing four int8 values per lane and using the four-way dot-product instruction.
3. **WMMA**, moving to tensor cores through the warp matrix API.
4. **Shared-memory staged WMMA**, with 32x32 warp tiles.

The interesting step was three to four. The first WMMA kernel was slower than I expected, so instead of
tuning blindly I costed it: the kernel was moving **8.6 GB across a 1008 GB/s bus**, which put it
firmly bandwidth-bound rather than compute-bound. Staging tiles through shared memory made it
**4.6x faster** and moved the bottleneck back to the tensor cores, where it belongs.

Peak throughput is **122.8 TOPS**. I originally reported this kernel as ahead of cuBLAS up to n=1024.
That turned out to be true only of cuBLAS as I was calling it, which is what the next part is about.

## Part three: the same kernel in Triton, and what it corrected

My write-up ranked the reasons the kernel still trailed cuBLAS at large sizes, with overlapping loads and
math first. Rather than argue the ranking, I rewrote the kernel in Triton at exactly the same tiling and
turned the suspected causes on one at a time, timing everything in one process with CUDA-graph replay and
checking every output against an exact reference before timing it.

- **Pipelining was worth nothing.** 1.01x at n=4096, even though the compiled kernel really did issue the
  asynchronous loads.
- **Tile size was the largest single step.** 1.66x at n=4096.
- **At identical tiling, Triton was already 1.61x faster,** from its swizzled shared-memory layout and a
  different tensor-core instruction shape, which the compiled output shows but cannot separate.

Then came the comparison I had not planned. My benchmark called cuBLAS with the second matrix stored
row-major. With both matrices laid out along K, the layout int8 tensor cores are built for, cuBLAS is 3.4x
faster than the call I had been measuring against.

| n=4096, microseconds per GEMM | time |
|---|---|
| my hand-written CUDA kernel | 1124.8 |
| cuBLAS, as my benchmark called it | 857.9 |
| cuBLAS, K-contiguous layout | **249.9** |
| my Triton kernel, K-contiguous layout | **254.3** |

So my kernel was never ahead of cuBLAS, only of a slow path through it. The Triton version is within 2% of
cuBLAS at 540 TOPS, and at n=2048 it is 1.45x faster than the fastest vendor path.

## Part four: beating cuDNN, and a measurement trap

I fused convolution, bias, and ReLU into a single CUDA kernel and compared it against cuDNN on the four
convolution shapes that dominate an edge CNN. It wins on three. These are small layers timed with
back-to-back launches, and the Triton work showed that method can include about 10 microseconds of host
cost per vendor call, so the three wins have not yet been re-timed with that cost excluded.

| Conv shape | vs cuDNN |
|---|---|
| Depthwise 3x3 | **6.02x** |
| Two further edge shapes | ahead |
| Dense 3x3 | 0.33x, against implicit GEMM |

The trap was in the harness, not the kernel. My first comparison had cuDNN looking suspiciously fast
until I checked numerics and found a **7.76e-3** discrepancy against the reference. cuDNN's default math
mode had silently promoted my fp32 inputs to TF32, so I was benchmarking a lower-precision kernel
against a full-precision one. Forcing `CUDNN_FMA_MATH` restored the comparison.

That is the kind of thing that turns a benchmark into a press release if nobody checks it.

## What I would do next

- Rewrite the hand-written kernel for the K-contiguous layout, which is worth 1.3x to Triton and 3.4x to cuBLAS.
- Re-time the cuDNN comparison with CUDA-graph replay, so per-call host cost cannot flatter the small layers.
- Port the NEON depthwise path to the same fused-epilogue structure as the CUDA one.
- Add an int4 rung to the ladder and measure where accuracy actually breaks.
