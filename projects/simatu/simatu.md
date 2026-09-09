# SiMATU: where knowledge lives is not where unlearning works

<div class="meta"><span><b>Context</b> CMU Deep Learning Systems, team project</span><span><b>Stack</b> Phi-3.5-mini 3.8B, RWKU benchmark, causal tracing</span></div>

<div class="ph">A layer-wise causal tracing heatmap is the natural hero image.<br>Drop it at <code>images/hero.png</code> and replace this block with <code>![](images/hero.png)</code></div>

## The question

Machine unlearning asks a model to forget a specific fact without damaging everything else it knows. The
intuitive approach is to find where the fact is stored and edit there.

We used **causal tracing** to actually locate storage, and then tested whether editing there works. It
does not, and the gap between those two locations is the finding.

<div class="stats"><div class="stat"><b>1 to 9</b><span>layers where the knowledge is stored</span></div><div class="stat"><b>21 to 31</b><span>layers where intervention actually works</span></div><div class="stat"><b>74.1% to 97.4%</b><span>guarded utility retention</span></div><div class="stat"><b>91.9%</b><span>unlearning success rate</span></div></div>

## Storage is early, control is late

Causal tracing on Phi-3.5-mini localises the target knowledge to **layers 1 through 9**. That is where
corrupting the residual stream destroys the model's ability to produce the fact.

Intervening at those layers to unlearn is ineffective and destructive. The layers where a targeted edit
reliably suppresses the fact without collateral damage are **21 through 31**, far downstream of where
the information enters.

The practical reading is that early layers hold the representation while late layers control whether it
surfaces, so **an unlearning method that targets storage sites is aiming at the wrong place**.

## The method

Rather than a single edit point, we placed multi-layer intervention modules at **layers 4, 15, and 29**,
spanning the storage region, the middle, and the control region.

| Metric | Before | After |
|---|---|---|
| Guarded utility retention (GUR) | 74.1% | **97.4%** |
| Unlearning success rate (USR) | n/a | **91.9%** |

The headline is the utility number. Getting a model to forget something is easy if you are willing to
damage it. Forgetting at **91.9% success while retaining 97.4% of guarded utility** is the part that
makes it a method rather than a lobotomy.

## Caveat

One model family and one benchmark. The storage-versus-control separation is a claim about Phi-3.5-mini
on RWKU, and whether the specific layer bands transfer is untested.
