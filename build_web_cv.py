"""Two-page CV for the website: everything she has, with a LEAN skills block.

Design rule she gave 2026-09-08: if a technology can sit naturally inside an
experience or project line, it goes there. The skills section carries only what is
left over. So the old 8-line skills wall becomes 2 lines, and the ~10 rendered lines
that frees pay for the sections the one-pagers never had room for: the full honors
list, leadership and service, and the two research internships plus the startup.

Fit to exactly 2 pages by compiling, never estimated.
"""
import copy, os, re, subprocess
import xml.etree.ElementTree as ET

SRC = "/Users/ashritha/Desktop/Resumes_Ashritha/Letter_2026"
OUT = "/Users/ashritha/Desktop/Resumes_Ashritha/Apply_2026"
G = os.path.join(SRC, "generate_resumes.py")
F = "Ashritha_Gonuguntla_CV_Full.tex"
BOT = 0.38 * 72

src = open(G).read()
ns = {}
exec(compile(src[:src.index("\nout = []")], G, "exec"), ns)
C, EPARTS, P, PUBS_CV = ns["C"], ns["EPARTS"], ns["P"], ns["PUBS_CV"]

PRE = (ns["PRE"]
       .replace(r"\usepackage[top=0.32in,bottom=0.32in,left=0.45in,right=0.45in]{geometry}",
                r"\usepackage[top=0.5in,bottom=0.38in,left=0.45in,right=0.45in,headheight=12pt,headsep=6pt]{geometry}")
       .replace(r"\pagestyle{fancy}\fancyhf{}\fancyfoot{}",
                r"\pagestyle{fancy}\fancyhf{}\fancyhead[L]{\small\scshape Ashritha Gonuguntla}"
                r"\fancyhead[R]{\small Curriculum Vitae $\cdot$ Page \thepage}")
       .replace(r"\renewcommand{\headrulewidth}{0pt}", r"\renewcommand{\headrulewidth}{0.3pt}")
       .replace(r"\begin{document}",
                "\\usepackage{anyfontsize}\n"
                r"\renewcommand{\small}{\fontsize{9}{10.6}\selectfont}" "\n"
                r"\begin{document}\thispagestyle{empty}")
       .replace("itemsep=0.3pt", "itemsep=1pt")
       .replace(r"\titlespacing*{\section}{0pt}{3pt}{2pt}",
                r"\titlespacing*{\section}{0pt}{5pt}{2pt}"))

HEADER = r"""\begin{center}
    {\fontsize{22}{23}\selectfont \scshape Ashritha Gonuguntla} \\ \vspace{3pt}
    \small
    \href{mailto:agonugun@cs.cmu.edu}{agonugun@cs.cmu.edu} $|$
    +1 (412) 209-9824 $|$
    \href{https://ashrithag.github.io}{ashrithag.github.io} $|$
    \href{https://linkedin.com/in/ashrithagonuguntla}{linkedin.com/in/ashrithagonuguntla} $|$
    \href{https://github.com/AshrithaG}{github.com/AshrithaG} \\ \vspace{2pt}
    {\small Pittsburgh, PA $\cdot$ Available January 2027}
\end{center}
\vspace{-4pt}
"""

EDU = r"""
\section{Education}
  \resumeSubHeadingListStart
    \resumeSubheading
      {Carnegie Mellon University, School of Computer Science}{Pittsburgh, PA}
      {Master of Software Engineering, \textbf{GPA 4.0/4.0}}{Aug 2025 -- Dec 2026}
      \resumeItemListStart
        \resumeItem{Coursework: AI Agents, Deep Learning Systems, Generative AI, Multimodal ML, Diffusion and Flow Matching, ML in Production, Computer Systems, Software Architecture, Mobile Robots, F1-Tenth Autonomous Racing.}
        \resumeItem{Teaching Assistant, four courses: ML in Production (Prof.\ K\"astner), Prompt Engineering (Prof.\ Breaux), Computer Systems (Prof.\ Kesden), Engineering Computation (Prof.\ Yamakawa).}
      \resumeItemListEnd
    \resumeSubheading
      {K L University}{Andhra Pradesh, India}
      {B.Tech Computer Science, AI \& Robotic Process Automation, \textbf{GPA 9.84/10, rank 2}}{Jun 2018 -- Mar 2022}
      \resumeItemListStart
        \resumeItem{Academic Excellence Award for second rank in the graduating class.}
      \resumeItemListEnd
  \resumeSubHeadingListEnd
\vspace{2pt}
"""

XP_EXTRA = r"""    \resumeExperienceHeading{IIIT Hyderabad}{Research Intern, Speech and Vision Lab}{}{Apr 2021 -- May 2021}
      \vspace{-8pt}\resumeItemListStart
        \resumeItem{Implemented neural architectures for automatic speech recognition and text-to-speech synthesis in \textbf{TensorFlow and PyTorch}.}
      \resumeItemListEnd
    \resumeExperienceHeading{University of Kerala}{ML Intern, Computational Biology \& Bioinformatics}{}{Oct 2020 -- Dec 2020}
      \vspace{-8pt}\resumeItemListStart
        \resumeItem{Built a \textbf{CycleGAN} pipeline for cross-domain style transfer, enhancing structural patterns in cellular microscopy images.}
      \resumeItemListEnd
"""

HONORS = r"""
\section{Honors and Awards}
  \resumeItemListStart
    \resumeItem{\textbf{Mary Shaw Award for Creativity in Software Engineering}, Carnegie Mellon, 2026 $\cdot$ 5th place, Gray Swan AI red-teaming challenge, 2026 $\cdot$ CMU Moon Miners, NASA Lunabotics, 2026.}
    \resumeItem{\textbf{JN Tata Scholar} and \textbf{KC Mahindra Scholar}, 2025 $\cdot$ 2nd place, Best Adoption category, AWS Graviton Challenge, 2024 $\cdot$ Recognised under Cisco's Achieve Operational Excellence category.}
    \resumeItem{\textbf{Winner, Adobe SheCodes}, 2020 $\cdot$ \textbf{National winner, Smart India Hackathon}, 2020 $\cdot$ McKinsey Next Generation Women Leaders, 2021 $\cdot$ Walmart CodeHers finalist, 9th rank, 2021 $\cdot$ Cisco Ideathon finalist, 2021.}
    \resumeItem{\textbf{Gold Medalist and Best Outgoing Student}, CBSE secondary school board, class of 2015.}
  \resumeItemListEnd
\vspace{2pt}
"""

SERVICE = r"""
\section{Leadership and Service}
  \resumeItemListStart
    \resumeItem{\textbf{Regional Chapter Lead, GirlScript Foundation India}: led the Andhra Pradesh chapter of a nonprofit running free coding programs for women and underrepresented students.}
    \resumeItem{\textbf{Volunteer, eVidyaloka Trust and Empower Ananya}: digital literacy for students in underserved rural and urban communities across India, through video classrooms and outreach.}
    \resumeItem{\textbf{Honored Speaker, ShaktiCon 2023}: ``5G IoT Security: Protecting the Next Generation of Connected Devices.'' $\cdot$ MSE Leadership Initiative, Carnegie Mellon.}
    \resumeItem{\textbf{Co-founder, Vector AI} (2019--2020): a cultural gaming startup; shipped \emph{Ethan's Adventure}, a puzzle game with custom enemy and character AI, to the Google Play Store.}
  \resumeItemListEnd
\vspace{2pt}
"""

# Lean by design: everything else is already named inside an experience or project line.
SKILLS = r"""    \textbf{Languages:} Python, C++20, Go, Java, C, SQL, Bash, TypeScript/JavaScript. \\
    \textbf{Additional tooling:} TensorFlow, scikit-learn, Ray, Flower, MLflow, PySpark, Redis, MongoDB, Oracle, Splunk, Helm, Terraform, Ansible, GCP, Azure, Isaac Sim, Gazebo, Nav2, GoogleTest."""

P["arm6dof"] = (r"\textbf{Autonomous Robotic Arm for EV Charging} $|$ \emph{computer vision, 6-DOF manipulation, team lead}", r"K L University", [
  r"\resumeItem{Led a team building the perception pipeline for a \textbf{6-DOF robotic arm} performing autonomous EV charger docking: object detection and spatial reasoning to localise the charging port.}",
])


def compose(cisco, projects, eparts):
    b = PRE + HEADER + EDU
    b += "\n\\section{Experience}\n  \\resumeSubHeadingListStart\n"
    b += "    \\resumeExperienceHeading{eParts Services (CMU MSE Studio client)}{Technical Lead, ML \\& Architecture}{}{2026 -- Present}\n      \\vspace{-8pt}\\resumeItemListStart\n"
    for k in eparts: b += "        " + EPARTS[k] + "\n"
    b += "      \\resumeItemListEnd\n"
    b += "    \\resumeExperienceHeading{Cisco}{Software Engineer $\\to$ Senior Software Engineer}{}{Aug 2022 -- Jul 2025}\n      \\vspace{-8pt}\\resumeItemListStart\n"
    for k in cisco: b += "        " + C[k] + "\n"
    # Strict reverse chronology: the two 2020-21 research internships belong between
    # Adobe (Aug 2021) and Microsoft (May 2020), so INTERN is split at the Microsoft head.
    MS_HEAD = r"\resumeExperienceHeading{Microsoft}{Software Engineering Intern}{}{May 2020 -- Aug 2020}\vspace{1pt}"
    pre_ms, _ = ns["INTERN"].split(MS_HEAD)
    MS = (r"\resumeExperienceHeading{Microsoft}{Software Engineering Intern}{}{May 2020 -- Aug 2020}"
          "\n      \\vspace{-8pt}\\resumeItemListStart\n        "
          r"\resumeItem{Built the metrics and insights layer of \textbf{Viva Insights} over terabytes of data for 27K+ companies, in Azure and \textbf{PySpark}; validated the influence and network algorithms end to end for customer release.}"
          "\n      \\resumeItemListEnd\n")
    b += "      \\resumeItemListEnd\n" + pre_ms + XP_EXTRA + MS
    b += "  \\resumeSubHeadingListEnd\n\\vspace{2pt}\n"
    b += PUBS_CV
    b += "\n\\section{Projects}\n  \\resumeSubHeadingListStart\n"
    for k in projects:
        n = None
        if isinstance(k, tuple): k, n = k
        left, right, bullets = P[k]
        b += "    \\resumeProjectHeading{" + left + "}{" + right + "}\n      \\resumeItemListStart\n"
        for line in (bullets[:n] if n else bullets): b += "        " + line + "\n"
        b += "      \\resumeItemListEnd\n"
    b += "  \\resumeSubHeadingListEnd\n\\vspace{2pt}\n"
    b += HONORS + SERVICE
    b += "\n\\section{Technical Skills}\n\\begin{itemize}[leftmargin=0.0in, label={}]\n  \\small{\\item{\n" + SKILLS + "\n  }}\n \\end{itemize}\n\\end{document}\n"
    return b


def pages(pdf):
    return int(re.search(r"^Pages:\s*(\d+)",
        subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout, re.M).group(1))


def slack(pdf):
    out = subprocess.run(["pdftotext", "-bbox", pdf, "-"], capture_output=True, text=True).stdout
    root = ET.fromstring(out); nsx = {"x": "http://www.w3.org/1999/xhtml"}
    last = (root.findall(".//x:page", nsx) or root.findall(".//page"))[-1]
    w = last.findall(".//x:word", nsx) or last.findall(".//word")
    return (float(last.get("height")) - BOT) - max(float(x.get("yMax")) for x in w)


def render(cisco, projects, eparts):
    open(os.path.join(OUT, F), "w").write(compose(cisco, projects, eparts))
    p = os.path.join(OUT, F)
    r = subprocess.run(["tectonic", "-X", "compile", p, "--outdir", OUT], capture_output=True)
    assert r.returncode == 0, r.stderr.decode()[-500:]
    pdf = p.replace(".tex", ".pdf")
    return pages(pdf), slack(pdf)


# Breadth over depth: this is the "everything" document, and every project has a
# full write-up on the site, so each gets 1-2 bullets rather than its full set.
CISCO = ["grpc", "query", "rag", "llm", "kafka", "vm", "ztna", "oncall", "anom"]
PROJECTS = [("nano", 2), ("replay", 2), ("apishift", 2), ("batchinv", 1), ("specdec", 1),
            ("qre_cv", 1), ("grrl", 1), ("mlops", 1), ("grid", 1), ("f1", 1),
            ("simatu", 1), ("arm6dof", 1), ("fedfd", 1), ("cars", 1)]
# Reduce bullets before dropping anything, and drop Cisco depth before project breadth.
TRIM = [("cisco", "anom"), ("cisco", "ztna"), ("red", "apishift", 1), ("cisco", "vm"),
        ("red", "nano", 1), ("red", "replay", 1), ("proj", "cars"), ("proj", "fedfd"),
        ("cisco", "kafka"), ("proj", "grid")]

cisco, proj, cut = list(CISCO), list(PROJECTS), []
for step in [None] + TRIM:
    if step:
        if step[0] == "cisco":
            cisco = [c for c in cisco if c != step[1]]; cut.append("-" + step[1])
        elif step[0] == "red":
            _, key, n = step
            proj = [(key, n) if (x[0] if isinstance(x, tuple) else x) == key else x for x in proj]
            cut.append(f"{key}->{n}b")
        else:
            proj = [x for x in proj if (x[0] if isinstance(x, tuple) else x) != step[1]]
            cut.append("-" + step[1])
    pg, sl = render(cisco, proj, ("lead", "diag", "harden"))
    if pg <= 2: break
print(f"{F}  {pg}pg  slack={round(sl,1)}pt")
print(f"  cisco:   {cisco}")
print(f"  projects:{[x[0] if isinstance(x,tuple) else x for x in proj]}")
print(f"  trimmed: {', '.join(cut) or 'nothing'}")
