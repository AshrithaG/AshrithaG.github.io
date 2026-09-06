# F1TENTH autonomous racing on real hardware

<div class="meta"><span><b>Context</b> CMU 16-663, team project</span><span><b>Stack</b> ROS2 Humble, Python, NVIDIA Jetson, Hokuyo LiDAR</span><span><b>Result</b> Won 3 of 3 races</span></div>

<div class="ph">This project deserves video.<br>Drop a lap recording at <code>images/hero.mp4</code> and replace this block with a video element.</div>

## What it is

A full autonomy stack on a physical 1/10-scale racecar, running on a Jetson with a Hokuyo LiDAR, racing
against other teams' cars on a real track. **Won all three races.**

Simulation forgives a great deal. Real hardware has actuator lag, LiDAR dropouts, tyre slip, and a wall
that does not respect your assumptions about the control frequency.

## The stack

- **Emergency braking on time-to-collision.** An instantaneous TTC computed per LiDAR beam, braking when
  any beam's closing time drops below threshold. This is the layer that runs regardless of what the
  planner wants, and it is the reason the car survived to be tuned.
- **PID wall following**, using the range difference between two beam angles to estimate heading error
  against the wall rather than distance alone.
- **Disparity-extended Follow-the-Gap.** Plain Follow-the-Gap steers into gaps the car cannot physically
  fit through, because a LiDAR beam passing a corner does not account for vehicle width. The disparity
  extension widens obstacles by the car's half-width before choosing a gap, which is what makes it work
  at speed instead of clipping corners.
- **Adaptive Pure Pursuit**, with lookahead scaled by velocity. Fixed lookahead either cuts corners at
  speed or oscillates when slow.
- **RRT\*** for planning around dynamic obstacles when the reactive layer is insufficient.

## What racing teaches that simulation does not

The disparity extension is a good example. In simulation, plain Follow-the-Gap looks fine. On hardware
at racing speed, the car clips the inside of every corner, because the gap the algorithm found was
measured for a point robot and the car is not a point.

Nearly every tuning decision on this project came from watching the car fail in a specific, physical
way and then working out which assumption in the algorithm was doing the damage.
