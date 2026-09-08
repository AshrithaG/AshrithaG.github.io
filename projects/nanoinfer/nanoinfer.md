# nanoinfer: a C++20 edge inference engine with a CUDA int8 backend

<div class="meta"><span><b>Stack</b> C++20, ARM NEON, CUDA, cuBLAS, cuDNN, ONNX Runtime</span><span><b>Role</b> Solo</span></div>

<div class="doclinks"><a class="btn btn--solid" href="https://github.com/AshrithaG/nanoinfer" target="_blank" rel="noopener">Code on GitHub</a></div>

<figure><img src="images/hero.png" alt=""><figcaption>Latency and thread scaling against ONNX Runtime. Apple M4 Pro, single inference, median of 600 timed runs at the best thread count for each configuration.</figcaption></figure>

## The short version

I wrote a neural network inference engine from scratch in C++20, first for ARM edge targets and then
with a CUDA int8 backend, and benchmarked every kernel against the production libraries it would have
to replace. The CPU engine lands at parity with ONNX Runtime on dense convolution. The CUDA int8 GEMM
beats cuBLAS up to n=1024. Where it loses, the write-up says so and explains why.

<div class="stats"><div class="stat"><b>0.99x</b><span>of ONNX Runtime on the dense CNN</span></div><div class="stat"><b>122.8 TOPS</b><span>int8 CUDA GEMM peak</span></div><div class="stat"><b>6.02x</b><span>over cuDNN on depthwise conv</span></div><div class="stat"><b>37 to 77%</b><span>less activation memory</span></div></div>

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
4. **Shared-memory staged WMMA**, with 32x32 warp tiles and double buffering.

The interesting step was three to four. The first WMMA kernel was slower than I expected, so instead of
tuning blindly I costed it: the kernel was moving **8.6 GB across a 1008 GB/s bus**, which put it
firmly bandwidth-bound rather than compute-bound. Staging tiles through shared memory made it
**4.6x faster** and moved the bottleneck back to the tensor cores, where it belongs.

| n | nanoinfer int8 GEMM vs cuBLAS |
|---|---|
| up to 1024 | **ahead of cuBLAS** |
| 4096 | 0.71x |

Peak throughput is **122.8 TOPS**. cuBLAS wins at 4096 because its tile schedule is tuned per
architecture across a shape space I did not attempt to cover.

## Part three: beating cuDNN, and a measurement trap

I fused convolution, bias, and ReLU into a single CUDA kernel and compared it against cuDNN on the four
convolution shapes that dominate an edge CNN. It wins on three.

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

- Autotune the tile schedule per shape rather than fixing 32x32, which is most of the gap at n=4096.
- Port the NEON depthwise path to the same fused-epilogue structure as the CUDA one.
- Add an int4 rung to the ladder and measure where accuracy actually breaks.
