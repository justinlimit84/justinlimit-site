"""
justinlimit.com: Class 9 Science, Ch 7 "Work, Energy, and Simple Machines" (NCERT Exploration, 2026).
Three short, silent explainer clips for the chapter page. Own numbers, own drawings: nothing from the book.
Separate from the outoflimit YouTube channel (no narration, no channel branding).

RENDER (from WSL, inside this folder so its custom_config.yml is used; GPU via ~/manim/gpu_render.py):
    cd /mnt/c/Users/PC/justinlimit-site/manim
    ~/manim/venv/bin/manimgl ch7_clips.py WorkArea EnergySwap SameWork -w
    bash render.sh          # renders all three and encodes the web copies into ../public/clips/

Every number shown here is also checked in tests/clips.test.ts (same values, recomputed in TypeScript).
"""
import os
import sys

sys.path.insert(0, os.path.expanduser("~/manim"))
import gpu_render  # noqa: F401  (draw on the RTX GPU, encode with NVENC) — before manimlib
from manimlib import *

BG = "#111111"
BLUE_C = "#00B3FF"
ORANGE_C = "#FF7A1A"
MINT_C = "#3DFFB0"
BRASS_C = "#D4A64A"
DIM_C = "#5A6270"
TEXT_C = "#F2F4F8"
MUTED_C = "#9AA3B2"
FONT = "Inter"
G = 10  # m s^-2, the value the chapter uses in its numerical examples


def T(s, size=34, color=TEXT_C, **kw):
    return Text(s, font=FONT, font_size=size, fill_color=color, **kw)


def fmt(x, nd=0):
    s = f"{x:.{nd}f}"
    return s.replace("-", "−")


class Clip(Scene):
    def setup(self):
        super().setup()
        if self.frame.get_width() < self.frame.get_height():
            raise RuntimeError("These clips are 16:9 landscape: run manimgl from inside justinlimit-site/manim/")

    def wipe(self, t=0.6):
        if self.mobjects:
            self.play(*[FadeOut(m) for m in self.mobjects], run_time=t)

    def title(self, s, sub=None):
        t = T(s, 40).to_edge(UP, buff=0.45)
        g = VGroup(t)
        if sub:
            st = T(sub, 26, MUTED_C).next_to(t, DOWN, buff=0.18)
            g.add(st)
        return g


# ----------------------------------------------------------------------------------------------
class WorkArea(Clip):
    """Work = force x displacement = area under the force-displacement graph (and its sign)."""

    def construct(self):
        head = self.title("Work = area under the force–displacement graph", "W = F × s")
        self.play(FadeIn(head, shift=0.2 * DOWN))

        axes = Axes(x_range=(0, 4.5, 1), y_range=(-20, 35, 10), width=7.2, height=4.6,
                    axis_config=dict(stroke_color=MUTED_C, stroke_width=2, include_tip=False))
        axes.to_edge(LEFT, buff=0.9).shift(0.55 * DOWN)
        for v in range(1, 5):
            axes.add(T(str(v), 22, MUTED_C).next_to(axes.c2p(v, 0), DOWN, buff=0.12))
        for f in (-10, 10, 20, 30):
            axes.add(T(fmt(f), 22, MUTED_C).next_to(axes.c2p(0, f), LEFT, buff=0.12))
        xl = T("displacement s (m)", 22, MUTED_C).next_to(axes.c2p(4.5, 0), DOWN, buff=0.45).shift(0.6 * LEFT)
        yl = T("force F (N)", 22, MUTED_C).next_to(axes.c2p(0, 35), RIGHT, buff=0.15)
        self.play(ShowCreation(axes), FadeIn(xl), FadeIn(yl), run_time=1.2)

        panel_x = 1.9
        # ---- 1. constant force 20 N over 3 m -> 60 J
        x = ValueTracker(0.001)
        F1 = 20
        rect = always_redraw(lambda: Polygon(
            axes.c2p(0, 0), axes.c2p(x.get_value(), 0), axes.c2p(x.get_value(), F1), axes.c2p(0, F1),
            fill_color=MINT_C, fill_opacity=0.35, stroke_color=MINT_C, stroke_width=3))
        line = Line(axes.c2p(0, F1), axes.c2p(3, F1), stroke_color=MINT_C, stroke_width=4)
        read = always_redraw(lambda: VGroup(
            T("constant force", 26, MINT_C),
            T(f"W = 20 N × {fmt(round(x.get_value(), 1), 1)} m", 30),
            T(f"= {fmt(F1 * round(x.get_value(), 1))} J", 40, MINT_C),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.22).move_to([panel_x, 0.6, 0], aligned_edge=LEFT))
        self.play(ShowCreation(line), run_time=0.6)
        self.add(rect, read)
        self.play(x.animate.set_value(3), run_time=3.5, rate_func=linear)
        note = T("the shaded rectangle is 20 N × 3 m = 60 J", 24, MUTED_C).next_to(axes, DOWN, buff=0.5)
        self.play(FadeIn(note))
        self.wait(1.6)

        # ---- 2. a force that grows from 0 to 30 N over 4 m: area of a triangle -> 60 J
        self.play(FadeOut(VGroup(rect, read, line, note)))
        self.remove(rect, read)
        tri_line = Line(axes.c2p(0, 0), axes.c2p(4, 30), stroke_color=BLUE_C, stroke_width=4)
        self.play(ShowCreation(tri_line))
        strips = VGroup()
        n = 8
        for i in range(n):
            s0, s1 = 4 * i / n, 4 * (i + 1) / n
            fm = 30 * (s0 + s1) / 2 / 4
            strips.add(Polygon(axes.c2p(s0, 0), axes.c2p(s1, 0), axes.c2p(s1, fm), axes.c2p(s0, fm),
                               fill_color=BLUE_C, fill_opacity=0.3, stroke_color=BLUE_C, stroke_width=1.5))
        txt2 = VGroup(T("force that grows", 26, BLUE_C),
                      T("add up thin strips:", 28),
                      T("each strip ≈ F × (small s)", 26, MUTED_C)).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        txt2.move_to([panel_x, 0.6, 0], aligned_edge=LEFT)
        self.play(FadeIn(txt2[:2]))
        self.play(LaggedStart(*[FadeIn(s, shift=0.1 * UP) for s in strips], lag_ratio=0.25), FadeIn(txt2[2]), run_time=2.2)
        tri = Polygon(axes.c2p(0, 0), axes.c2p(4, 0), axes.c2p(4, 30),
                      fill_color=BLUE_C, fill_opacity=0.38, stroke_color=BLUE_C, stroke_width=3)
        res2 = VGroup(T("area of the triangle", 28),
                      T("= ½ × 4 m × 30 N", 30),
                      T("= 60 J", 40, BLUE_C)).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        res2.move_to([panel_x, 0.6, 0], aligned_edge=LEFT)
        self.play(ReplacementTransform(strips, tri), FadeTransform(txt2, res2), run_time=1.4)
        self.wait(2.0)

        # ---- 3. force opposite to the displacement -> negative work
        self.play(FadeOut(VGroup(tri, tri_line, res2)))
        neg = Polygon(axes.c2p(0, 0), axes.c2p(2, 0), axes.c2p(2, -15), axes.c2p(0, -15),
                      fill_color=ORANGE_C, fill_opacity=0.38, stroke_color=ORANGE_C, stroke_width=3)
        res3 = VGroup(T("force against the motion", 26, ORANGE_C),
                      T("F = −15 N, s = 2 m", 30),
                      T("W = −30 J", 40, ORANGE_C),
                      T("area below the axis counts as negative", 22, MUTED_C)).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        res3.move_to([panel_x, 0.4, 0], aligned_edge=LEFT)
        self.play(GrowFromEdge(neg, UP), FadeIn(res3[:2]), run_time=1.2)
        self.play(FadeIn(res3[2:]))
        self.wait(2.4)
        self.wipe()


# ----------------------------------------------------------------------------------------------
class EnergySwap(Clip):
    """A 2 kg ball falls from 5 m: PE turns into KE, and their sum stays 100 J (no air resistance)."""

    def construct(self):
        m, h0 = 2, 5
        E = m * G * h0  # 100 J
        head = self.title("Falling: potential energy turns into kinetic energy", "m = 2 kg, dropped from h = 5 m, g = 10 m s⁻²")
        self.play(FadeIn(head, shift=0.2 * DOWN))

        # height scale (left)
        top_y, bot_y = 1.9, -3.1
        unit = (top_y - bot_y) / h0
        sx = -4.6
        scale = VGroup(Line([sx, bot_y, 0], [sx, top_y, 0], stroke_color=MUTED_C, stroke_width=2))
        for k in range(h0 + 1):
            yk = bot_y + k * unit
            scale.add(Line([sx - 0.12, yk, 0], [sx + 0.12, yk, 0], stroke_color=MUTED_C, stroke_width=2))
            scale.add(T(f"{k} m", 22, MUTED_C).next_to([sx - 0.12, yk, 0], LEFT, buff=0.12))
        ground = Line([sx - 0.2, bot_y - 0.28, 0], [sx + 2.6, bot_y - 0.28, 0], stroke_color=DIM_C, stroke_width=4)
        self.play(ShowCreation(scale), ShowCreation(ground))

        t = ValueTracker(0)  # seconds of real fall; total 1 s since h = ½ g t² gives t = 1 s

        def height():
            return max(0.0, h0 - 0.5 * G * t.get_value() ** 2)

        ball = always_redraw(lambda: Circle(radius=0.26, fill_color=BRASS_C, fill_opacity=1, stroke_width=0)
                             .move_to([sx + 1.2, bot_y + height() * unit - 0.02, 0]))
        self.play(FadeIn(ball, scale=0.5))

        # energy bars (right)
        base_y, bar_h = -2.6, 4.2
        xs = {"PE = mgh": (0.6, BLUE_C), "KE = ½mv²": (2.6, ORANGE_C), "total": (4.6, MINT_C)}

        def bars():
            hh = height()
            pe = m * G * hh
            ke = E - pe
            vals = {"PE = mgh": pe, "KE = ½mv²": ke, "total": pe + ke}
            g = VGroup()
            for name, (bx, col) in xs.items():
                v = vals[name]
                hgt = max(0.001, bar_h * v / E)
                g.add(Rectangle(width=1.1, height=hgt, fill_color=col, fill_opacity=0.85, stroke_width=0)
                      .move_to([bx, base_y + hgt / 2, 0]))
                g.add(T(f"{fmt(v)} J", 28, col).move_to([bx, base_y + bar_h + 0.35, 0]))
                g.add(T(name, 22, MUTED_C).move_to([bx, base_y - 0.35, 0]))
            return g

        frame_bars = always_redraw(bars)
        speed = always_redraw(lambda: T(
            f"height {fmt(height(), 2)} m    speed v = {fmt(G * t.get_value(), 2)} m s⁻¹", 26, TEXT_C
        ).move_to([1.6, -3.55, 0]))
        self.play(FadeIn(frame_bars), FadeIn(speed))
        self.wait(0.8)
        self.play(t.animate.set_value(1.0), run_time=7, rate_func=linear)
        self.wait(0.6)

        end = VGroup(
            T("PE lost = KE gained, so the total stays 100 J", 30, MINT_C),
            T("½mv² = mgh  →  v = √(2gh) = √(2 × 10 × 5) = 10 m s⁻¹", 28),
        ).arrange(DOWN, buff=0.25)
        box = SurroundingRectangle(end, buff=0.3, stroke_color=MINT_C, stroke_width=2).set_fill(BG, 0.92)
        g = VGroup(box, end).move_to([1.4, 0.4, 0])
        self.play(FadeIn(g, shift=0.2 * UP))
        self.wait(3.2)
        self.wipe()


# ----------------------------------------------------------------------------------------------
class SameWork(Clip):
    """Simple machines reduce the force you need, not the work you do."""

    def construct(self):
        head = self.title("A machine makes the force smaller, not the work", "load: a 10 kg box (weight mg = 100 N), raised by h = 1 m")
        self.play(FadeIn(head, shift=0.2 * DOWN))

        floor_y = -2.6
        # ---- left: lift straight up
        lx = -4.4
        floor_l = Line([lx - 1.6, floor_y, 0], [lx + 1.6, floor_y, 0], stroke_color=DIM_C, stroke_width=4)
        unit = 2.0  # 1 m on screen
        shelf = Line([lx - 1.2, floor_y + unit, 0], [lx + 1.6, floor_y + unit, 0], stroke_color=DIM_C, stroke_width=4)
        box_l = Square(0.6, fill_color=BRASS_C, fill_opacity=1, stroke_width=0).move_to([lx - 0.8, floor_y + 0.3, 0])
        lab_l = VGroup(T("lift it straight up", 26, MUTED_C),
                       T("F = 100 N over 1 m", 28),
                       T("W = 100 J", 34, BLUE_C)).arrange(DOWN, buff=0.15).move_to([lx, 1.6, 0])
        self.play(ShowCreation(floor_l), ShowCreation(shelf), FadeIn(box_l))
        arr_l = Arrow(box_l.get_top(), box_l.get_top() + 0.9 * UP, buff=0, thickness=6, fill_color=BLUE_C)
        self.play(GrowArrow(arr_l), FadeIn(lab_l[:2]))
        self.play(VGroup(box_l, arr_l).animate.shift(unit * UP), run_time=1.4)
        self.play(FadeIn(lab_l[2]))

        # ---- right: ramp of length 4 m to the same height
        rx0, ry0 = 0.0, floor_y
        L_m, h_m = 4.0, 1.0
        base_m = (L_m ** 2 - h_m ** 2) ** 0.5
        k = 1.3  # screen units per metre along the ramp (drawn smaller than the left side)
        p0 = np.array([rx0, ry0, 0])
        p1 = np.array([rx0 + base_m * k, ry0 + h_m * k, 0])
        ramp = Polygon(p0, np.array([p1[0], ry0, 0]), p1, fill_color="#1E232B", fill_opacity=1,
                       stroke_color=MUTED_C, stroke_width=2)
        along = (p1 - p0) / np.linalg.norm(p1 - p0)
        normal = np.array([-along[1], along[0], 0])
        s = ValueTracker(0.0)
        box_r = always_redraw(lambda: Square(0.42, fill_color=BRASS_C, fill_opacity=1, stroke_width=0)
                              .rotate(np.arctan2(along[1], along[0]))
                              .move_to(p0 + along * (0.35 + s.get_value() * (np.linalg.norm(p1 - p0) - 0.7)) + normal * 0.22))
        arr_r = always_redraw(lambda: Arrow(box_r.get_center(), box_r.get_center() + along * 0.75,
                                            buff=0, thickness=4, fill_color=ORANGE_C))
        lab_r = VGroup(T("push it up a 4 m ramp", 26, MUTED_C),
                       T("F′ = 25 N over 4 m", 28),
                       T("W = 100 J", 34, ORANGE_C),
                       T("MA = L / h = 4 m / 1 m = 4", 26, MINT_C)).arrange(DOWN, buff=0.15).move_to([3.0, 1.6, 0])
        self.play(FadeIn(ramp), FadeIn(box_r), FadeIn(lab_r[:2]))
        self.add(arr_r)
        self.play(s.animate.set_value(1), run_time=2.6, rate_func=smooth)
        self.play(FadeIn(lab_r[2]))
        self.play(FadeIn(lab_r[3]))
        same = T("same 100 J of work, a quarter of the force", 30, MINT_C).move_to([0, -3.45, 0])
        self.play(FadeIn(same, shift=0.15 * UP))
        self.wait(2.4)
        self.wipe()

        # ---- lever: 100 N effort lifts a 400 N load
        head2 = self.title("A lever does the same trick", "effort arm 2 m, load arm 0.5 m")
        self.play(FadeIn(head2, shift=0.2 * DOWN))
        piv = np.array([0.6, -1.9, 0])
        sc = 2.2  # screen units per metre
        fulcrum = Polygon(piv, piv + [-0.35, -0.6, 0], piv + [0.35, -0.6, 0], fill_color=DIM_C, fill_opacity=1, stroke_width=0)
        ang = ValueTracker(0.0)

        def beam_pts():
            a = ang.get_value()
            d = np.array([np.cos(a), np.sin(a), 0])
            return piv - d * 2 * sc, piv + d * 0.5 * sc  # effort end (left, 2 m), load end (right, 0.5 m)

        beam = always_redraw(lambda: Line(*beam_pts(), stroke_color=TEXT_C, stroke_width=8))
        load = always_redraw(lambda: Square(0.5, fill_color=BRASS_C, fill_opacity=1, stroke_width=0)
                             .move_to(beam_pts()[1] + 0.3 * UP))
        eff = always_redraw(lambda: Arrow(beam_pts()[0] + 1.1 * UP, beam_pts()[0] + 0.05 * UP, buff=0,
                                          thickness=5, fill_color=ORANGE_C))
        lbl = VGroup(T("effort 100 N", 26, ORANGE_C).move_to(piv + [-2 * sc, 1.65, 0]),
                     T("load 400 N", 26, BRASS_C).move_to(piv + [0.5 * sc + 1.2, 0.35, 0]))
        self.play(FadeIn(fulcrum), ShowCreation(beam), FadeIn(load), FadeIn(eff), FadeIn(lbl))
        # rotate so the effort end goes down by 0.4 m: sin(a) * 2 m = 0.4 m
        a_end = np.arcsin(0.4 / 2)
        self.play(ang.animate.set_value(a_end), run_time=2.0, rate_func=smooth)
        res = VGroup(
            T("effort end moves 0.4 m, load end moves 0.1 m", 26, MUTED_C),
            T("effort × distance = 100 N × 0.4 m = 40 J", 28, ORANGE_C),
            T("load × distance = 400 N × 0.1 m = 40 J", 28, BRASS_C),
            T("MA = effort arm / load arm = 2 / 0.5 = 4", 28, MINT_C),
        ).arrange(DOWN, buff=0.18).move_to([2.4, 1.7, 0])
        self.play(LaggedStart(*[FadeIn(r, shift=0.1 * UP) for r in res], lag_ratio=0.6), run_time=3)
        self.wait(3.0)
        self.wipe()
