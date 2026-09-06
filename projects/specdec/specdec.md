# Speculative decoding that loses at every window size

<div class="meta"><span><b>Stack</b> PyTorch, Qwen3-0.6B draft, Qwen3-4B target, RTX 4090</span><span><b>Role</b> Solo</span></div>

<div class="doclinks"><a class="btn btn--solid" href="https://github.com/AshrithaG/specdec" target="_blank" rel="noopener">Code on GitHub</a></div>

<div class="ph">A speedup-versus-window-size curve is the right hero here.<br>Drop it at <code>images/hero.png</code> and replace this block with <code>![](images/hero.png)</code></div>

## What this is

Speculative decoding implemented from scratch: a small draft model proposes *k* tokens, the large target
model verifies them in one forward pass, and accepted tokens come free. It is one of the standard
inference speedups and it is supposed to be free of quality loss.

I built it, measured it, and it lost. Every window size. Then I worked out why, and found a second
problem nobody had told me about.

<div class="stats"><div class="stat"><b>0.87x to 0.51x</b><span>speedup across every window size tested</span></div><div class="stat"><b>0.649</b><span>draft cost as a fraction of a target pass</span></div><div class="stat"><b>5 of 480</b><span>argmax flips under the lossless guarantee</span></div></div>

## Finding one: the arithmetic does not close in eager PyTorch

Every window size *k* I tried came in **below 1.0x**, from 0.87x down to 0.51x as *k* grew.

The reason is a single number. Drafting with Qwen3-0.6B against a Qwen3-4B target costs **0.649 of a
target forward pass**, not the small fraction the technique assumes. Once drafting is that expensive,
the break-even condition collapses to something simple:

> Speculative decoding wins only when the acceptance rate exceeds the draft-to-target cost ratio.

At a cost ratio of 0.649 you need to accept nearly two out of every three proposed tokens just to break
even, and a 0.6B model drafting for a 4B model does not clear that bar on general text.

This is not a claim that speculative decoding does not work. It is a claim that **the draft-to-target
cost ratio is the whole ballgame**, and that in eager PyTorch, without a fused or batched draft path, a
6.7x parameter gap is not a 6.7x cost gap. Production implementations win by attacking exactly this term.

## Finding two: the lossless guarantee is not lossless in bf16

Speculative decoding is advertised as output-identical to plain decoding, because rejection sampling is
constructed to preserve the target distribution exactly.

Exactly, in real arithmetic.

I compared speculative output against plain greedy decoding with identical weights and found
**5 argmax flips in 480 positions**. The verification step computes logits through a different
arithmetic path than the plain path does, and in **bfloat16** the rounding difference occasionally
crosses the boundary between the top two candidates.

The flips are not random. Every one occurred where the **logit margin between the top two tokens fell
below a predictable threshold**, which means the failure is characterisable in advance rather than
being a mystery.

## Why this write-up exists

A negative result with a mechanism is more useful than a positive result without one. Anyone
considering speculative decoding can take two things from here: measure your draft cost ratio before you
build, and do not assume bit-exactness in reduced precision just because the algorithm is lossless on
paper.
