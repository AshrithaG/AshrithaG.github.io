# When the metric is wrong

<div class="meta"><span><b>Thread</b> Six studies, one question</span><span><b>Author</b> Sole author throughout</span><span><b>Method</b> Build the system, then the measurement</span></div>

Most of my work has the same shape. Take a number that people already trust, find the situation where it ranks the wrong thing, and build the harness that measures it properly. On their own these read as unrelated projects: an agent paper, a recommender benchmark, a kernel. Put side by side they are one program, and this page is where they sit together.

## Six measurements that disagreed with the standard one

| Study | The trusted measurement | What it got wrong | How it was shown |
|---|---|---|---|
| [The Replay Gap](projects.html?p=replay-gap) | Scoring model-routing decisions by replaying recorded agent trajectories | Misscores 92 to 97% of switching decisions, because it grades each one against agent states that are never actually reached | A resumable branching-rollout harness: 889 rollouts over 20,141 requests and 42.5 GPU-hours, forking live SWE-bench runs and rebuilding each Docker environment |
| [Simulator Control Arms](projects.html?p=simulator-control-arms) | An LLM judge standing in for users | Orders search stacks much as users do, Kendall tau 0.8, yet credits only 60% of an LLM reranker's real gain against 89% of LambdaMART's, which moves that reranker from first to third on QuAC under every prompt wording | Five retrieval stacks over QReCC; the judge grades results frozen from the real-user run, so any disagreement is about judging, never about retrieval changing underneath it |
| [Query-rewrite evaluation](projects.html?p=query-rewrite-eval) | ROUGE-L against reference rewrites | Ranks six rewriting strategies backwards from recall@10, Kendall tau -0.73 to -0.87 over 12,561 turns; the no-rewrite baseline scores third-best on ROUGE at 0.240 recall | A hand-built sharded BM25 index, with the result stable across a 5x corpus scale-up |
| [MovieLens evaluation protocols](projects.html?p=movielens-evaluation-protocols) | "Which recommender is best" | The split decides, not the model: on identical interactions a two-tower model is last of five under a time split, 6.8 nDCG points below popularity, and first under leave-last-one-out, 6.2 points above it | Five models, two protocols, paired bootstrap |
| [batch-invariance](projects.html?p=batch-invariance) | vLLM's documented determinism mode | The documentation names a cost and never quantifies it: 54 to 67% of throughput | A probe harness isolating batch size, batch composition and repeat rate |
| [int8-linear](projects.html?p=int8-linear) | Timing each layer's kernel in isolation | Tables tuned per layer made the served model's decode slower at two batch sizes | A 28-layer stand-in that reproduced the served model within 0.5 microseconds per decoder layer, three end-to-end runs in vLLM, and a dispatch-bucket regression reported upstream as vllm-project/vllm#56924 |

## Where my own measurement was wrong

The same habit has to apply to my own tools, and four times it caught me.

- **A denominator that rewarded shedding.** In [serving-control-plane](https://github.com/AshrithaG/serving-control-plane), dividing goodput by the time until the last request drained gave a policy that sheds early a smaller denominator for the same successes. Under it, my admission-control policy looked 41% ahead of FIFO. Over the offered-load window, which is identical for every policy, it was 14% behind.
- **A checker that convicted a correct implementation.** In [raft-control-plane](https://github.com/AshrithaG/raft-control-plane), my linearizability checker forced every timed-out operation into the history, when an operation whose result the client never learned may simply never have happened. A "detection" of the Raft paper's figure 8 at one seed turned out to be a separate bug in my read barriers, found because the same seed also failed on the correct implementation.
- **A harness that read silence as success.** In [agent-sandbox-bench](https://github.com/AshrithaG/agent-sandbox-bench), empty output was scored as "allowed", which would have claimed gVisor ignores the pids limit. What actually happens is stranger: at a limit of 50, gVisor kills the whole sandbox after 10 forks, where runc fails the 50th fork cleanly.
- **A speed claim my own run refuted.** An early [nanoinfer](projects.html?p=nanoinfer) result said my CUDA int8 GEMM ran ahead of cuBLAS. It was true only of cuBLAS called with one operand row-major; with both operands K-contiguous, cuBLAS leads. The write-up now says so.

## Why it is one program

Each of these is an argument about what a number is allowed to mean. A benchmark answers the question its protocol asks, which is not always the question a team is deciding. The work I want to keep doing sits in that gap: finding where the standard measurement and the real decision come apart, and building the instrument that closes it.
