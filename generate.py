#!/usr/bin/env python3
"""Generate visual diagram PNGs for StockSense AI slides."""

from PIL import Image, ImageDraw, ImageFont
import os

FONT_R = "/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf"
FONT_B = "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"
OUT = os.getcwd()+"/public"

# Colors
BLUE = (21, 101, 192)
BLUE_LIGHT = (227, 242, 253)
BLUE_MID = (100, 160, 230)
GREEN = (46, 125, 50)
GREEN_LIGHT = (232, 245, 233)
AMBER = (245, 127, 23)
AMBER_LIGHT = (255, 243, 224)
RED_C = (183, 28, 28)
RED_LIGHT = (255, 235, 238)
GRAY = (97, 97, 97)
GRAY_LIGHT = (245, 245, 245)
GRAY_MID = (200, 200, 200)
WHITE = (255, 255, 255)
BLACK = (30, 30, 30)
DARK = (33, 33, 33)

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def draw_rounded_rect(draw, xy, radius, fill, outline=None, outline_width=2):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill,
                            outline=outline, width=outline_width)

def center_text(draw, text, x, y, font, fill, max_width=None):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text((x - tw//2, y), text, font=font, fill=fill)

def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines

def draw_text_wrapped(draw, text, x, y, font, fill, max_width, align="left"):
    lines = wrap_text(text, font, max_width, draw)
    for line in lines:
        if align == "center":
            bbox = draw.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            draw.text((x - tw//2, y), line, font=font, fill=fill)
        else:
            draw.text((x, y), line, font=font, fill=fill)
        bbox = draw.textbbox((0, 0), line, font=font)
        y += (bbox[3] - bbox[1]) + 4
    return y

# ─────────────────────────────────────────────
# DIAGRAM 1: Process Flow (Slide 6)
# ─────────────────────────────────────────────
def make_flowchart():
    W, H = 2200, 1100
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    fb = get_font(FONT_B, 36)
    fr = get_font(FONT_R, 28)
    fs = get_font(FONT_R, 24)
    ft = get_font(FONT_B, 42)

    # Title
    draw_rounded_rect(draw, [0, 0, W, 80], 0, BLUE)
    center_text(draw, "StockSense AI — Process Flow", W//2, 20, get_font(FONT_B, 38), WHITE)

    steps = [
        ("1", "User Input", "Retail investor types stock\nquestion via web/mobile chat", BLUE, BLUE_LIGHT),
        ("2", "AI Processing", "Google Gemini + Claude process\nquery with NSE/BSE context", (21, 101, 160), (227, 242, 253)),
        ("3", "Response\nGeneration", "Detailed market analysis:\nfundamentals, PE ratio, sector", (0, 100, 80), (232, 245, 240)),
        ("4", "Explainability\nLayer", "Data sources, reasoning chain,\nconfidence level (High/Med/Low)", GREEN, GREEN_LIGHT),
        ("5", "Bias Audit\nCheck", "Checks: Market Cap, Sector,\nRecency & Sentiment bias", AMBER, AMBER_LIGHT),
        ("6", "Fairness Score\nOutput", "0-100 score displayed with\nevery response to investor", RED_C, RED_LIGHT),
    ]

    box_w = 310
    box_h = 180
    gap_x = 60
    start_x = 60
    y_top = 130
    arrow_color = (150, 150, 150)

    for i, (num, title, desc, col, bg) in enumerate(steps):
        x = start_x + i * (box_w + gap_x)
        y = y_top

        # Shadow
        draw.rounded_rectangle([x+4, y+4, x+box_w+4, y+box_h+4], radius=14, fill=(200, 200, 200))
        # Box
        draw.rounded_rectangle([x, y, x+box_w, y+box_h], radius=14, fill=bg, outline=col, width=3)

        # Number badge
        draw.ellipse([x+12, y+12, x+52, y+52], fill=col)
        center_text(draw, num, x+32, y+18, get_font(FONT_B, 24), WHITE)

        # Title
        cx = x + box_w//2
        title_lines = title.split("\n")
        ty = y + 65
        for tl in title_lines:
            center_text(draw, tl, cx, ty, get_font(FONT_B, 30), col)
            ty += 34

        # Description
        desc_lines = desc.split("\n")
        dy = ty + 8
        for dl in desc_lines:
            center_text(draw, dl, cx, dy, fs, GRAY)
            dy += 28

        # Arrow
        if i < len(steps) - 1:
            ax = x + box_w + 4
            ay = y + box_h//2
            draw.polygon([(ax, ay-14), (ax+gap_x-4, ay), (ax, ay+14)], fill=arrow_color)

    # Second row: flow sub-boxes for Bias types
    bias_y = y_top + box_h + 80
    bias_items = [
        ("Market Cap\nBias", BLUE),
        ("Sector\nConc. Bias", GREEN),
        ("Recency\nBias", AMBER),
        ("Sentiment\nBias", RED_C),
    ]
    bw, bh = 220, 90
    total_bw = len(bias_items)*bw + (len(bias_items)-1)*30
    bx_start = (W - total_bw)//2
    label_font = get_font(FONT_B, 24)

    # Arrow from step 5 down
    step5_x = start_x + 4*(box_w+gap_x) + box_w//2
    draw.line([(step5_x, y_top+box_h+4), (step5_x, bias_y-10)], fill=AMBER, width=3)
    draw.polygon([(step5_x-10, bias_y-14), (step5_x+10, bias_y-14), (step5_x, bias_y)], fill=AMBER)

    draw.text((bx_start - 180, bias_y + 20), "Bias Types Checked:", font=get_font(FONT_B, 26), fill=DARK)
    for j, (label, col) in enumerate(bias_items):
        bx = bx_start + j*(bw+30)
        draw.rounded_rectangle([bx, bias_y, bx+bw, bias_y+bh], radius=10, fill=col, outline=WHITE, width=2)
        llines = label.split("\n")
        ly = bias_y + 16
        for ll in llines:
            center_text(draw, ll, bx+bw//2, ly, label_font, WHITE)
            ly += 30

    # Fairness score visual at bottom
    fs_y = bias_y + bh + 50
    draw_rounded_rect(draw, [60, fs_y, W-60, fs_y+120], 14, GRAY_LIGHT, GRAY_MID, 2)
    draw.text((80, fs_y+14), "Fairness Score Result:", font=get_font(FONT_B, 28), fill=DARK)
    scores = [("80-100\nFairness Score", GREEN, "Well-balanced advice"), ("50-79\nFairness Score", AMBER, "Mild pattern - review"), ("0-49\nFairness Score", RED_C, "High bias alert")]
    sw = (W-160-60)//3
    for k, (slabel, scol, sdesc) in enumerate(scores):
        sx = 80 + k*(sw+20)
        draw.rounded_rectangle([sx, fs_y+50, sx+sw, fs_y+110], radius=8, fill=scol)
        sl = slabel.split("\n")
        sy2 = fs_y + 56
        for sll in sl:
            center_text(draw, sll, sx+sw//2, sy2, get_font(FONT_B, 20), WHITE)
            sy2 += 24

    img.save(f"{OUT}/diagram_flowchart.jpg", dpi=(150, 150))
    print("Flowchart saved")

# ─────────────────────────────────────────────
# DIAGRAM 2: UI Wireframes (Slide 7)
# ─────────────────────────────────────────────
def make_wireframes():
    W, H = 2200, 1100
    img = Image.new("RGB", (W, H), (240, 244, 248))
    draw = ImageDraw.Draw(img)

    fb = get_font(FONT_B, 32)
    fr = get_font(FONT_R, 24)
    fs = get_font(FONT_R, 20)

    # Title bar
    draw.rectangle([0, 0, W, 72], fill=BLUE)
    center_text(draw, "StockSense AI — UI Wireframes", W//2, 18, get_font(FONT_B, 36), WHITE)

    # ── Screen 1: Chat Interface (left, tall) ──
    sx1, sy1, sw1, sh1 = 30, 90, 520, 960
    draw.rounded_rectangle([sx1, sy1, sx1+sw1, sy1+sh1], radius=12, fill=WHITE, outline=BLUE, width=3)
    # App header
    draw.rounded_rectangle([sx1, sy1, sx1+sw1, sy1+52], radius=12, fill=BLUE)
    draw.rounded_rectangle([sx1, sy1+30, sx1+sw1, sy1+52], radius=0, fill=BLUE)
    draw.text((sx1+10, sy1+10), "StockSense AI", font=get_font(FONT_B, 28), fill=WHITE)
    draw.text((sx1+10, sy1+38), "NSE  |  BSE  |  LIVE", font=get_font(FONT_R, 18), fill=(180, 220, 255))
    # Ticker bar
    draw.rectangle([sx1, sy1+52, sx1+sw1, sy1+82], fill=(21, 60, 100))
    ticker = "NIFTY +0.82%   SENSEX +0.74%   TCS +1.12%   RELIANCE -0.31%   HDFC +0.55%"
    draw.text((sx1+8, sy1+60), ticker, font=get_font(FONT_R, 16), fill=(100, 220, 100))
    # Chat bubbles
    # AI bubble
    draw.rounded_rectangle([sx1+10, sy1+95, sx1+400, sy1+200], radius=10, fill=BLUE_LIGHT, outline=BLUE_MID, width=1)
    draw.text((sx1+18, sy1+102), "AI", font=get_font(FONT_B, 18), fill=BLUE)
    draw_text_wrapped(draw, "TCS is a strong long-term pick. PE ratio at 28.4x is fair for IT sector. Q4 FY25 earnings grew 4.5%.", sx1+18, sy1+124, fr, DARK, sw1-30)
    # User bubble
    draw.rounded_rectangle([sx1+100, sy1+215, sx1+sw1-10, sy1+270], radius=10, fill=BLUE, outline=BLUE, width=1)
    draw.text((sx1+110, sy1+230), "Analyze TCS for long-term investment", font=fr, fill=WHITE)
    # Explainability card
    draw.rounded_rectangle([sx1+10, sy1+285, sx1+sw1-10, sy1+440], radius=8, fill=(250, 250, 255), outline=BLUE_MID, width=2)
    draw.rectangle([sx1+10, sy1+285, sx1+sw1-10, sy1+315], fill=(21, 101, 192))
    draw.rounded_rectangle([sx1+10, sy1+285, sx1+sw1-10, sy1+315], radius=8, fill=BLUE)
    draw.rounded_rectangle([sx1+10, sy1+304, sx1+sw1-10, sy1+315], radius=0, fill=BLUE)
    draw.text((sx1+18, sy1+292), "Why did I say this? (Explainability Card)", font=get_font(FONT_B, 18), fill=WHITE)
    exp_items = [("Confidence:", "High (87%)", GREEN), ("Source 1:", "Q4 FY25 Earnings Report", BLUE), ("Source 2:", "PE Ratio 28.4 | IT Trend", BLUE), ("Reasoning:", "Step1>Step2>Step3 chain", GRAY), ("Limitation:", "Global IT slowdown risk", AMBER)]
    ey = sy1+322
    for lbl, val, col in exp_items:
        draw.text((sx1+18, ey), lbl, font=get_font(FONT_B, 17), fill=col)
        draw.text((sx1+130, ey), val, font=get_font(FONT_R, 17), fill=DARK)
        ey += 22
    # Fairness badge
    draw.rounded_rectangle([sx1+10, sy1+452, sx1+sw1-10, sy1+510], radius=10, fill=AMBER_LIGHT, outline=AMBER, width=2)
    draw.text((sx1+18, sy1+460), "FAIRNESS SCORE", font=get_font(FONT_B, 19), fill=AMBER)
    draw.text((sx1+18, sy1+484), "74 / 100   Amber — Mild IT concentration", font=get_font(FONT_R, 18), fill=DARK)
    # Suggestion chips
    chips = ["Analyze NIFTY 50", "Best IT Stocks", "What is P/E?", "FII/DII Activity"]
    cx2 = sx1+10
    cy2 = sy1+sh1-130
    draw.text((cx2, cy2-26), "Quick Questions:", font=get_font(FONT_B, 18), fill=GRAY)
    for chip in chips:
        cbbox = draw.textbbox((0, 0), chip, font=get_font(FONT_R, 17))
        cw = cbbox[2]-cbbox[0]+20
        draw.rounded_rectangle([cx2, cy2, cx2+cw, cy2+32], radius=16, fill=BLUE_LIGHT, outline=BLUE, width=1)
        draw.text((cx2+10, cy2+6), chip, font=get_font(FONT_R, 17), fill=BLUE)
        cx2 += cw+10
        if cx2 > sx1+sw1-60:
            cx2 = sx1+10
            cy2 += 38
    # Input bar
    draw.rounded_rectangle([sx1+10, sy1+sh1-72, sx1+sw1-10, sy1+sh1-16], radius=24, fill=GRAY_LIGHT, outline=GRAY_MID, width=2)
    draw.text((sx1+24, sy1+sh1-56), "Ask about any NSE/BSE stock...", font=fr, fill=(160,160,160))
    draw.ellipse([sx1+sw1-52, sy1+sh1-62, sx1+sw1-18, sy1+sh1-26], fill=BLUE)
    draw.text((sx1+sw1-44, sy1+sh1-54), ">>", font=get_font(FONT_B, 20), fill=WHITE)
    # Label
    draw.text((sx1+sw1//2-80, sy1+sh1+8), "Screen 1: Chat Interface", font=get_font(FONT_B, 22), fill=BLUE)

    # ── Screen 2: Bias Audit Dashboard (middle) ──
    sx2, sy2, sw2, sh2 = 580, 90, 760, 960
    draw.rounded_rectangle([sx2, sy2, sx2+sw2, sy2+sh2], radius=12, fill=WHITE, outline=GREEN, width=3)
    draw.rounded_rectangle([sx2, sy2, sx2+sw2, sy2+52], radius=12, fill=GREEN)
    draw.rounded_rectangle([sx2, sy2+30, sx2+sw2, sy2+52], radius=0, fill=GREEN)
    draw.text((sx2+12, sy2+10), "Bias Audit Dashboard", font=get_font(FONT_B, 28), fill=WHITE)

    # Fairness gauge
    gy = sy2+70
    draw.text((sx2+20, gy), "Overall Fairness Score", font=get_font(FONT_B, 24), fill=DARK)
    # Big score circle
    draw.ellipse([sx2+sw2//2-80, gy+30, sx2+sw2//2+80, gy+190], fill=AMBER_LIGHT, outline=AMBER, width=4)
    center_text(draw, "74", sx2+sw2//2, gy+70, get_font(FONT_B, 60), AMBER)
    center_text(draw, "/ 100", sx2+sw2//2, gy+138, get_font(FONT_B, 26), GRAY)
    center_text(draw, "AMBER — Review Suggested", sx2+sw2//2, gy+200, get_font(FONT_B, 20), AMBER)

    # Sector donut (text-based pie chart)
    chart_y = gy + 240
    draw.text((sx2+20, chart_y), "Sector Distribution", font=get_font(FONT_B, 24), fill=DARK)
    sectors = [("IT", 34, BLUE), ("Banking", 28, GREEN), ("Pharma", 18, AMBER), ("Others", 20, GRAY)]
    bar_x = sx2+20
    bar_y = chart_y+36
    bar_total_w = sw2-40
    for sname, spct, scol in sectors:
        sw_bar = int(bar_total_w * spct / 100)
        draw.rounded_rectangle([bar_x, bar_y, bar_x+sw_bar, bar_y+36], radius=4, fill=scol)
        draw.text((bar_x+sw_bar+8, bar_y+8), f"{sname} {spct}%", font=get_font(FONT_B, 20), fill=scol)
        bar_y += 46

    # Market Cap distribution
    cap_y = bar_y + 20
    draw.text((sx2+20, cap_y), "Market Cap Breakdown", font=get_font(FONT_B, 24), fill=DARK)
    caps = [("Large Cap", 71, BLUE), ("Mid Cap", 22, GREEN), ("Small Cap", 7, AMBER)]
    cap_y += 36
    for cname, cpct, ccol in caps:
        cw_bar = int(bar_total_w * cpct / 100)
        draw.rounded_rectangle([sx2+20, cap_y, sx2+20+cw_bar, cap_y+32], radius=4, fill=ccol)
        draw.text((sx2+20+cw_bar+8, cap_y+6), f"{cname} {cpct}%", font=get_font(FONT_B, 20), fill=ccol)
        cap_y += 42

    # Alert banner
    alert_y = cap_y + 20
    draw.rounded_rectangle([sx2+10, alert_y, sx2+sw2-10, alert_y+60], radius=8, fill=AMBER_LIGHT, outline=AMBER, width=2)
    draw.text((sx2+20, alert_y+8), "⚠ Alert:", font=get_font(FONT_B, 22), fill=AMBER)
    draw.text((sx2+20, alert_y+34), "Slight IT sector concentration detected", font=get_font(FONT_R, 20), fill=DARK)

    # Trend mini-chart
    trend_y = alert_y + 80
    draw.text((sx2+20, trend_y), "Fairness Score Trend (Last 10 Queries)", font=get_font(FONT_B, 22), fill=DARK)
    trend_scores = [74, 68, 72, 78, 82, 75, 69, 74, 79, 74]
    chart_h = 120
    chart_x = sx2+20
    chart_w2 = sw2-40
    tw = chart_w2//(len(trend_scores)-1)
    min_s, max_s = 60, 90
    pts = []
    for ti, ts in enumerate(trend_scores):
        px = chart_x + ti*tw
        py = trend_y+36 + chart_h - int((ts-min_s)/(max_s-min_s)*chart_h)
        pts.append((px, py))
    if len(pts) > 1:
        draw.line(pts, fill=BLUE, width=3)
    for px, py in pts:
        draw.ellipse([px-5, py-5, px+5, py+5], fill=BLUE, outline=WHITE, width=2)
    # Y axis labels
    draw.text((chart_x, trend_y+36), "90", font=fs, fill=GRAY)
    draw.text((chart_x, trend_y+36+chart_h//2), "75", font=fs, fill=GRAY)
    draw.text((chart_x, trend_y+36+chart_h), "60", font=fs, fill=GRAY)

    draw.text((sx2+sw2//2-110, sy2+sh2+8), "Screen 2: Bias Audit Dashboard", font=get_font(FONT_B, 22), fill=GREEN)

    # ── Screen 3: Architecture overview (right) ──
    sx3, sy3, sw3, sh3 = 1370, 90, 800, 960
    draw.rounded_rectangle([sx3, sy3, sx3+sw3, sy3+sh3], radius=12, fill=WHITE, outline=(100,0,160), width=3)
    draw.rounded_rectangle([sx3, sy3, sx3+sw3, sy3+52], radius=12, fill=(100,0,160))
    draw.rounded_rectangle([sx3, sy3+30, sx3+sw3, sy3+52], radius=0, fill=(100,0,160))
    draw.text((sx3+12, sy3+10), "System Architecture Overview", font=get_font(FONT_B, 28), fill=WHITE)

    arch_layers = [
        ("Frontend Layer", "React.js PWA | Tailwind CSS | Chart.js\nVercel CDN | Chat UI | Bias Dashboard", BLUE, BLUE_LIGHT),
        ("AI & Intelligence", "Google Gemini API (Primary)\nClaude API (Secondary) | Bias NLP Pipeline\nFairness Score Calculator", GREEN, GREEN_LIGHT),
        ("Backend API", "Python 3.11 + FastAPI\nGoogle AI SDK | Anthropic SDK\nConversation Memory | Audit Logs", (0,120,120), (220,245,245)),
        ("Data Sources", "NSE/BSE APIs | Yahoo Finance\nEconomic Times RSS | Alpha Vantage", AMBER, AMBER_LIGHT),
        ("Cloud: GCP", "Cloud Run | Cloud SQL (PostgreSQL)\nFirebase DB | Redis Cache | Docker\nGitHub Actions CI/CD", RED_C, RED_LIGHT),
    ]

    ay3 = sy3+65
    layer_h = 155
    for lname, ldesc, lcol, lbg in arch_layers:
        draw.rounded_rectangle([sx3+15, ay3, sx3+sw3-15, ay3+layer_h], radius=10, fill=lbg, outline=lcol, width=2)
        # Left badge
        draw.rounded_rectangle([sx3+15, ay3, sx3+185, ay3+layer_h], radius=10, fill=lcol)
        draw.rounded_rectangle([sx3+175, ay3, sx3+185, ay3+layer_h], radius=0, fill=lcol)
        lname_lines = lname.split(" ")
        lny = ay3 + layer_h//2 - len(lname_lines)*18
        for ln in lname_lines:
            center_text(draw, ln, sx3+100, lny, get_font(FONT_B, 24), WHITE)
            lny += 32
        # Description
        desc_lines = ldesc.split("\n")
        dy3 = ay3 + layer_h//2 - len(desc_lines)*14
        for dl in desc_lines:
            draw.text((sx3+200, dy3), dl, font=get_font(FONT_R, 22), fill=DARK)
            dy3 += 32
        # Arrow down
        if lname != arch_layers[-1][0]:
            mx = sx3 + sw3//2
            draw.polygon([(mx-12, ay3+layer_h+2), (mx+12, ay3+layer_h+2), (mx, ay3+layer_h+18)], fill=GRAY_MID)
        ay3 += layer_h + 20

    draw.text((sx3+sw3//2-130, sy3+sh3+8), "Screen 3: Architecture Overview", font=get_font(FONT_B, 22), fill=(100,0,160))

    img.save(f"{OUT}/diagram_wireframes.png", dpi=(150, 150))
    print("Wireframes saved")

# ─────────────────────────────────────────────
# DIAGRAM 3: Architecture Diagram (Slide 8)
# ─────────────────────────────────────────────
def make_architecture():
    W, H = 2200, 1100
    img = Image.new("RGB", (W, H), (240, 244, 248))
    draw = ImageDraw.Draw(img)

    # Title
    draw.rectangle([0, 0, W, 72], fill=(21, 50, 120))
    center_text(draw, "StockSense AI — System Architecture", W//2, 18, get_font(FONT_B, 38), WHITE)

    layers = [
        {
            "name": "FRONTEND",
            "color": BLUE,
            "bg": BLUE_LIGHT,
            "items": ["React.js PWA", "Chat Interface", "Bias Audit Dashboard", "Chart.js Visuals", "Tailwind CSS", "Vercel CDN"]
        },
        {
            "name": "AI ENGINE",
            "color": GREEN,
            "bg": GREEN_LIGHT,
            "items": ["Google Gemini API", "Claude API (Anthropic)", "Bias Detection NLP", "Fairness Calculator", "Sentiment Analysis", "Indian Stock Prompt"]
        },
        {
            "name": "BACKEND",
            "color": (0, 120, 120),
            "bg": (220, 245, 245),
            "items": ["Python 3.11 + FastAPI", "REST API Endpoints", "Google AI SDK", "Anthropic SDK", "Conversation Memory", "Audit Log Generator"]
        },
        {
            "name": "DATA SOURCES",
            "color": AMBER,
            "bg": AMBER_LIGHT,
            "items": ["NSE/BSE Official APIs", "Yahoo Finance API", "Economic Times RSS", "Alpha Vantage", "Market Benchmarks", "FII/DII Data Feeds"]
        },
        {
            "name": "CLOUD (GCP)",
            "color": RED_C,
            "bg": RED_LIGHT,
            "items": ["Cloud Run (Backend)", "Cloud SQL PostgreSQL", "Firebase Realtime DB", "Redis Cache", "Docker Containers", "GitHub Actions CI/CD"]
        },
    ]

    box_w = 360
    box_h = 860
    gap_x = 50
    total = len(layers)*box_w + (len(layers)-1)*gap_x
    start_x = (W - total)//2
    top_y = 100

    icon_font = get_font(FONT_B, 26)
    item_font = get_font(FONT_R, 24)
    title_font = get_font(FONT_B, 30)

    for i, layer in enumerate(layers):
        x = start_x + i*(box_w+gap_x)
        col = layer["color"]
        bg = layer["bg"]

        # Shadow
        draw.rounded_rectangle([x+4, top_y+4, x+box_w+4, top_y+box_h+4], radius=16, fill=(200,200,200))
        # Main box
        draw.rounded_rectangle([x, top_y, x+box_w, top_y+box_h], radius=16, fill=bg, outline=col, width=3)
        # Header
        draw.rounded_rectangle([x, top_y, x+box_w, top_y+62], radius=16, fill=col)
        draw.rounded_rectangle([x, top_y+42, x+box_w, top_y+62], radius=0, fill=col)
        center_text(draw, layer["name"], x+box_w//2, top_y+14, title_font, WHITE)

        # Items
        iy = top_y + 80
        for item in layer["items"]:
            # Item pill
            draw.rounded_rectangle([x+14, iy, x+box_w-14, iy+90], radius=10, fill=WHITE, outline=col, width=2)
            # Dot
            draw.ellipse([x+26, iy+32, x+46, iy+52], fill=col)
            # Text wrapped
            draw_text_wrapped(draw, item, x+54, iy+14, item_font, DARK, box_w-80)
            iy += 108

        # Connector arrows (right side)
        if i < len(layers)-1:
            ax = x+box_w+4
            ay = top_y + box_h//2
            draw.line([(ax, ay), (ax+gap_x-4, ay)], fill=GRAY, width=3)
            draw.polygon([(ax+gap_x-12, ay-12), (ax+gap_x, ay), (ax+gap_x-12, ay+12)], fill=GRAY)

    # Legend
    ly = top_y + box_h + 20
    draw.text((start_x, ly), "Data Flow:", font=get_font(FONT_B, 26), fill=DARK)
    flow_items = [("User Request", BLUE), ("AI Response", GREEN), ("Backend Processing", (0,120,120)), ("Data Fetch", AMBER), ("Cloud Deploy", RED_C)]
    fx = start_x + 160
    for fname, fcol in flow_items:
        draw.rounded_rectangle([fx, ly, fx+180, ly+36], radius=8, fill=fcol)
        center_text(draw, fname, fx+90, ly+8, get_font(FONT_R, 20), WHITE)
        fx += 196

    img.save(f"{OUT}/diagram_architecture.png", dpi=(150, 150))
    print("Architecture saved")

# ─────────────────────────────────────────────
# DIAGRAM 4: MVP Snapshots mockup (Slide 11)
# ─────────────────────────────────────────────
def make_mvp_snapshots():
    W, H = 2200, 1100
    img = Image.new("RGB", (W, H), (240, 244, 248))
    draw = ImageDraw.Draw(img)

    # Title
    draw.rectangle([0, 0, W, 72], fill=BLUE)
    center_text(draw, "StockSense AI — MVP Snapshot Mockups", W//2, 18, get_font(FONT_B, 38), WHITE)

    # ─── Left panel: Chat + TCS analysis ───
    px1, py1, pw1, ph1 = 20, 88, 680, 980
    draw.rounded_rectangle([px1, py1, px1+pw1, py1+ph1], radius=12, fill=WHITE, outline=BLUE, width=3)
    # Header
    draw.rounded_rectangle([px1, py1, px1+pw1, py1+50], radius=12, fill=BLUE)
    draw.rounded_rectangle([px1, py1+28, px1+pw1, py1+50], radius=0, fill=BLUE)
    draw.text((px1+12, py1+8), "StockSense AI - Live Chat", font=get_font(FONT_B, 26), fill=WHITE)
    # Ticker
    draw.rectangle([px1, py1+50, px1+pw1, py1+76], fill=(21, 60, 100))
    draw.text((px1+8, py1+57), "NIFTY 24,311 +0.82%  |  SENSEX 79,942 +0.74%  |  TCS 3,812 +1.12%", font=get_font(FONT_R, 16), fill=(80, 220, 80))
    # User query bubble
    draw.rounded_rectangle([px1+140, py1+88, px1+pw1-10, py1+128], radius=10, fill=BLUE)
    draw.text((px1+152, py1+98), "Analyze TCS for long-term investment", font=get_font(FONT_R, 22), fill=WHITE)
    # AI response
    ai_y = py1+142
    draw.rounded_rectangle([px1+10, ai_y, px1+pw1-10, ai_y+350], radius=10, fill=BLUE_LIGHT, outline=BLUE_MID, width=1)
    draw.text((px1+18, ai_y+10), "StockSense AI", font=get_font(FONT_B, 20), fill=BLUE)
    response_lines = [
        ("TCS Analysis — Long-Term View", True, BLUE),
        ("", False, DARK),
        ("PE Ratio: 28.4x (Fair for IT large-cap)", False, DARK),
        ("Q4 FY25 Revenue Growth: +4.5% YoY", False, DARK),
        ("Dividend Yield: 1.8% (Consistent payer)", False, DARK),
        ("IT Sector Outlook: Stable (cautious H2)", False, DARK),
        ("", False, DARK),
        ("Verdict: HOLD / BUY on dips. Strong", False, GREEN),
        ("fundamentals, but global IT slowdown", False, GREEN),
        ("risk not fully priced in yet.", False, GREEN),
    ]
    rl_y = ai_y + 36
    for text, bold, col in response_lines:
        if text:
            fnt = get_font(FONT_B if bold else FONT_R, 21 if bold else 20)
            draw.text((px1+18, rl_y), text, font=fnt, fill=col)
        rl_y += 26

    # Explainability Card
    ec_y = ai_y + 360
    draw.rounded_rectangle([px1+10, ec_y, px1+pw1-10, ec_y+195], radius=8, fill=(248,250,255), outline=BLUE, width=2)
    draw.rounded_rectangle([px1+10, ec_y, px1+pw1-10, ec_y+36], radius=8, fill=BLUE)
    draw.rounded_rectangle([px1+10, ec_y+18, px1+pw1-10, ec_y+36], radius=0, fill=BLUE)
    draw.text((px1+18, ec_y+8), "Why did I say this? [Explainability Card]", font=get_font(FONT_B, 19), fill=WHITE)
    ec_items = [
        ("Confidence:", "High (87%)", GREEN),
        ("Sources:", "Q4 FY25 Earnings | PE 28.4 | IT Trend", BLUE),
        ("Step 1:", "Fundamentals confirmed — Strong", DARK),
        ("Step 2:", "Sector comparison — Favorable", DARK),
        ("Step 3:", "Risk factors assessed — Moderate", DARK),
        ("Limitation:", "Global IT slowdown not fully priced", AMBER),
    ]
    ey2 = ec_y+44
    for lbl, val, col in ec_items:
        draw.text((px1+18, ey2), lbl, font=get_font(FONT_B, 18), fill=col)
        draw.text((px1+150, ey2), val, font=get_font(FONT_R, 18), fill=DARK)
        ey2 += 23

    # Fairness Badge
    fb_y = ec_y + 203
    draw.rounded_rectangle([px1+10, fb_y, px1+pw1-10, fb_y+60], radius=10, fill=AMBER_LIGHT, outline=AMBER, width=2)
    draw.text((px1+18, fb_y+8), "FAIRNESS SCORE:  74 / 100", font=get_font(FONT_B, 26), fill=AMBER)
    draw.text((px1+18, fb_y+36), "Mild IT concentration detected — review suggested", font=get_font(FONT_R, 19), fill=DARK)

    # Input bar
    ib_y = py1+ph1-68
    draw.rounded_rectangle([px1+10, ib_y, px1+pw1-10, ib_y+48], radius=24, fill=GRAY_LIGHT, outline=GRAY_MID, width=2)
    draw.text((px1+24, ib_y+13), "Ask about NSE/BSE stocks, sectors, IPOs...", font=get_font(FONT_R, 20), fill=(160,160,160))
    draw.ellipse([px1+pw1-56, ib_y+4, px1+pw1-14, ib_y+44], fill=BLUE)
    center_text(draw, ">>", px1+pw1-35, ib_y+14, get_font(FONT_B, 20), WHITE)

    # Snapshot label
    draw.text((px1+pw1//2-120, py1+ph1+8), "Snapshot 1-2: Chat + Explainability", font=get_font(FONT_B, 22), fill=BLUE)

    # ─── Middle panel: Bias Audit Dashboard ───
    px2, py2, pw2, ph2 = 720, 88, 720, 980
    draw.rounded_rectangle([px2, py2, px2+pw2, py2+ph2], radius=12, fill=WHITE, outline=GREEN, width=3)
    draw.rounded_rectangle([px2, py2, px2+pw2, py2+50], radius=12, fill=GREEN)
    draw.rounded_rectangle([px2, py2+28, px2+pw2, py2+50], radius=0, fill=GREEN)
    draw.text((px2+12, py2+8), "Bias Audit Dashboard", font=get_font(FONT_B, 28), fill=WHITE)

    # Big fairness gauge
    draw.text((px2+20, py2+62), "OVERALL FAIRNESS SCORE", font=get_font(FONT_B, 24), fill=DARK)
    draw.ellipse([px2+pw2//2-90, py2+96, px2+pw2//2+90, py2+276], fill=AMBER_LIGHT, outline=AMBER, width=5)
    center_text(draw, "74", px2+pw2//2, py2+136, get_font(FONT_B, 72), AMBER)
    center_text(draw, "/ 100  AMBER", px2+pw2//2, py2+226, get_font(FONT_B, 28), AMBER)

    # Sector bar chart
    draw.text((px2+20, py2+296), "Sector Distribution", font=get_font(FONT_B, 26), fill=DARK)
    sectors2 = [("IT Sector", 34, BLUE), ("Banking", 28, GREEN), ("Pharma", 18, AMBER), ("Others", 20, GRAY)]
    bary = py2+332
    for sn, sp, sc in sectors2:
        bw2 = int((pw2-40)*sp/100)
        draw.rounded_rectangle([px2+20, bary, px2+20+bw2, bary+38], radius=6, fill=sc)
        draw.text((px2+20+bw2+8, bary+8), f"{sn} {sp}%", font=get_font(FONT_B, 22), fill=sc)
        bary += 50

    # Market cap bars
    draw.text((px2+20, bary+10), "Market Cap Breakdown", font=get_font(FONT_B, 26), fill=DARK)
    caps2 = [("Large Cap", 71, BLUE), ("Mid Cap", 22, GREEN), ("Small Cap", 7, AMBER)]
    bary2 = bary+46
    for cn, cp, cc in caps2:
        cw2 = int((pw2-40)*cp/100)
        draw.rounded_rectangle([px2+20, bary2, px2+20+cw2, bary2+36], radius=6, fill=cc)
        draw.text((px2+20+cw2+8, bary2+8), f"{cn}: {cp}%", font=get_font(FONT_B, 22), fill=cc)
        bary2 += 46

    # Trend chart
    draw.text((px2+20, bary2+14), "Fairness Score Trend", font=get_font(FONT_B, 26), fill=DARK)
    t_scores = [74, 68, 72, 78, 82, 75, 69, 74, 79, 74]
    chart_top = bary2+50
    chart_bott = chart_top+180
    chart_left = px2+40
    chart_right = px2+pw2-20
    tw2 = (chart_right-chart_left)//(len(t_scores)-1)
    pts2 = []
    for ti, ts in enumerate(t_scores):
        px_t = chart_left + ti*tw2
        py_t = chart_bott - int((ts-60)/(90-60)*(chart_bott-chart_top))
        pts2.append((px_t, py_t))
    draw.line([(chart_left, chart_top), (chart_left, chart_bott), (chart_right, chart_bott)], fill=GRAY_MID, width=2)
    if len(pts2)>1: draw.line(pts2, fill=BLUE, width=3)
    for px_t, py_t in pts2:
        draw.ellipse([px_t-5, py_t-5, px_t+5, py_t+5], fill=BLUE, outline=WHITE, width=2)
    draw.text((chart_left-30, chart_top), "90", font=get_font(FONT_R, 18), fill=GRAY)
    draw.text((chart_left-30, (chart_top+chart_bott)//2), "75", font=get_font(FONT_R, 18), fill=GRAY)
    draw.text((chart_left-30, chart_bott-10), "60", font=get_font(FONT_R, 18), fill=GRAY)

    # Alert
    al_y = chart_bott + 20
    draw.rounded_rectangle([px2+10, al_y, px2+pw2-10, al_y+68], radius=8, fill=AMBER_LIGHT, outline=AMBER, width=2)
    draw.text((px2+20, al_y+8), "⚠ Bias Alert:", font=get_font(FONT_B, 22), fill=AMBER)
    draw.text((px2+20, al_y+36), "IT sector concentration: 34% (threshold 30%)", font=get_font(FONT_R, 20), fill=DARK)

    draw.text((px2+pw2//2-130, py2+ph2+8), "Snapshot 3-4: Bias Dashboard", font=get_font(FONT_B, 22), fill=GREEN)

    # ─── Right panel: Live Ticker + Fairness Badges ───
    px3, py3, pw3, ph3 = 1460, 88, 720, 980
    draw.rounded_rectangle([px3, py3, px3+pw3, py3+ph3], radius=12, fill=WHITE, outline=RED_C, width=3)
    draw.rounded_rectangle([px3, py3, px3+pw3, py3+50], radius=12, fill=RED_C)
    draw.rounded_rectangle([px3, py3+28, px3+pw3, py3+50], radius=0, fill=RED_C)
    draw.text((px3+12, py3+8), "Live Ticker + Fairness Badges", font=get_font(FONT_B, 26), fill=WHITE)

    # Live tickers
    draw.text((px3+20, py3+62), "LIVE MARKET DATA", font=get_font(FONT_B, 26), fill=DARK)
    tickers3 = [
        ("NIFTY 50", "24,311", "+0.82%", GREEN, True),
        ("SENSEX", "79,942", "+0.74%", GREEN, True),
        ("TCS", "3,812", "+1.12%", GREEN, True),
        ("RELIANCE", "1,421", "-0.31%", RED_C, False),
        ("HDFC BANK", "1,782", "+0.55%", GREEN, True),
        ("INFOSYS", "1,567", "-0.18%", RED_C, False),
    ]
    ty3 = py3+100
    for tname, tprice, tchange, tcol, tup in tickers3:
        draw.rounded_rectangle([px3+15, ty3, px3+pw3-15, ty3+78], radius=10, fill=GRAY_LIGHT, outline=GRAY_MID, width=1)
        draw.text((px3+26, ty3+10), tname, font=get_font(FONT_B, 24), fill=DARK)
        draw.text((px3+26, ty3+42), f"₹ {tprice}", font=get_font(FONT_B, 28), fill=DARK)
        chbg = GREEN_LIGHT if tup else RED_LIGHT
        draw.rounded_rectangle([px3+pw3-130, ty3+20, px3+pw3-20, ty3+58], radius=8, fill=chbg, outline=tcol, width=2)
        center_text(draw, tchange, px3+pw3-75, ty3+26, get_font(FONT_B, 24), tcol)
        draw.text((px3+26+240, ty3+46), "Click to analyze →", font=get_font(FONT_R, 18), fill=BLUE)
        ty3 += 92

    # Fairness score badge examples
    fs3_y = ty3 + 20
    draw.text((px3+20, fs3_y), "FAIRNESS SCORE BADGES", font=get_font(FONT_B, 26), fill=DARK)
    badges = [
        ("92 / 100", "EXCELLENT", GREEN, GREEN_LIGHT, "Well-balanced, data-driven advice"),
        ("74 / 100", "AMBER", AMBER, AMBER_LIGHT, "Mild IT concentration detected"),
        ("38 / 100", "ALERT", RED_C, RED_LIGHT, "High bias — see explanation"),
    ]
    by3 = fs3_y+46
    for bscore, blabel, bcol, bbg, bdesc in badges:
        draw.rounded_rectangle([px3+15, by3, px3+pw3-15, by3+98], radius=12, fill=bbg, outline=bcol, width=3)
        draw.text((px3+26, by3+12), blabel, font=get_font(FONT_B, 28), fill=bcol)
        draw.text((px3+26, by3+48), bscore, font=get_font(FONT_B, 34), fill=bcol)
        draw_text_wrapped(draw, bdesc, px3+220, by3+16, get_font(FONT_R, 20), DARK, pw3-240)
        by3 += 114

    draw.text((px3+pw3//2-140, py3+ph3+8), "Snapshot 5: Tickers + Fairness Badges", font=get_font(FONT_B, 22), fill=RED_C)

    img.save(f"{OUT}/diagram_mvp.png", dpi=(150, 150))
    print("MVP snapshots saved")

make_flowchart()
make_wireframes()
make_architecture()
make_mvp_snapshots()
print("All diagrams done!")