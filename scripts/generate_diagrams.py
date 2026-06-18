"""Generate publication-quality PNG diagrams for the SMPC Protocol thesis.

Usage:
    python scripts/generate_diagrams.py --all
    python scripts/generate_diagrams.py --diagram seven-layer
    python scripts/generate_diagrams.py --diagram contract-interaction
    python scripts/generate_diagrams.py --diagram five-tier
    python scripts/generate_diagrams.py --diagram sequence
    python scripts/generate_diagrams.py --diagram contract-tree
    python scripts/generate_diagrams.py --diagram coordinator-arch
"""

import argparse
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

# ── Shared constants ──────────────────────────────────────────────────────────

DPI = 300
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs', 'images')

COLORS = {
    'primary':    '#E8F0FE',
    'secondary':  '#F5F5F5',
    'accent':     '#D4E6FF',
    'border':     '#4A6FA5',
    'arrow':      '#333333',
    'heading':    '#1A1A1A',
    'detail':     '#444444',
    'background': '#FFFFFF',
    'highlight':  '#C8DAFE',
    'tier_header': '#4A6FA5',
}

FONT_HEADING = {'fontsize': 11, 'fontweight': 'bold', 'color': COLORS['heading'], 'fontfamily': 'sans-serif'}
FONT_BODY = {'fontsize': 9, 'color': COLORS['detail'], 'fontfamily': 'sans-serif'}
FONT_SMALL = {'fontsize': 7.5, 'color': COLORS['detail'], 'fontfamily': 'sans-serif'}
FONT_TITLE = {'fontsize': 14, 'fontweight': 'bold', 'color': COLORS['heading'], 'fontfamily': 'sans-serif'}

# Spacing constants (in normalized figure coords, ~6-15px at 300 DPI on a 12" figure)
PAD_BOX = 0.015          # inner padding from box edge to text
GAP_BETWEEN = 0.030      # gap between separate sibling boxes
GAP_ARROW = 0.025        # arrow corridor between layers
GAP_INNER = 0.012        # gap between sub-boxes inside a container
GAP_TIER = 0.035         # gap between tier containers


# ── Helper functions ──────────────────────────────────────────────────────────

def draw_box(ax, x, y, w, h, label='', facecolor=None, fontdict=None,
             edgecolor=None, linewidth=1.5, radius=0.015, zorder=2,
             label_y_offset=0):
    """Draw a rounded rectangle at (x, y) bottom-left with size (w, h)."""
    fc = facecolor or COLORS['primary']
    ec = edgecolor or COLORS['border']
    fd = fontdict or FONT_BODY
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad={radius}",
                         facecolor=fc, edgecolor=ec, linewidth=linewidth,
                         zorder=zorder)
    ax.add_patch(box)
    if label:
        ax.text(x + w / 2, y + h / 2 + label_y_offset, label,
                ha='center', va='center', zorder=zorder + 1, **fd)
    return box


def draw_arrow(ax, x1, y1, x2, y2, color=None, style='->', linewidth=1.5,
               connectionstyle='arc3,rad=0', zorder=3):
    """Draw an arrow between two points."""
    c = color or COLORS['arrow']
    arrow = FancyArrowPatch((x1, y1), (x2, y2),
                            arrowstyle=style, color=c,
                            linewidth=linewidth,
                            connectionstyle=connectionstyle,
                            zorder=zorder,
                            mutation_scale=15)
    ax.add_patch(arrow)
    return arrow


def setup_figure(figsize, title=None):
    """Create a figure with no axes and white background."""
    fig, ax = plt.subplots(figsize=figsize)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    fig.patch.set_facecolor(COLORS['background'])
    ax.set_facecolor(COLORS['background'])
    if title:
        ax.text(0.5, 0.97, title, ha='center', va='top', **FONT_TITLE)
    return fig, ax


def save_figure(fig, filename):
    """Save figure to OUTPUT_DIR at 300 DPI."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    fig.savefig(path, dpi=DPI, bbox_inches='tight', facecolor=COLORS['background'],
                pad_inches=0.15)
    plt.close(fig)
    print(f"  Saved: {path}")


# ── Diagram 1: Seven-Layer Architecture ──────────────────────────────────────

def generate_seven_layer():
    """Fig 4.1: Seven-Layer System Architecture.

    Uses a top-down y cursor: `y` always points to the TOP edge of the next
    element.  Boxes are placed with bottom-left at (x, y - h).
    """
    fig, ax = setup_figure((12, 14))
    ax.text(0.5, 0.98, 'Seven-Layer System Architecture',
            ha='center', va='top', **FONT_TITLE)

    margin = 0.06
    full_w = 0.88
    half_w = 0.40
    layer_h = 0.060
    arrow_gap = 0.025          # vertical space consumed by each arrow

    # y = top edge of the next element (starts just below the title)
    y = 0.93

    # --- Layer 7: User Interface (full width) ---
    y -= layer_h
    draw_box(ax, margin, y, full_w, layer_h, facecolor=COLORS['primary'])
    ax.text(margin + full_w / 2, y + layer_h * 0.70,
            'Layer 7: User Interface', ha='center', va='center', **FONT_HEADING)
    ax.text(margin + full_w / 2, y + layer_h * 0.30,
            'Data Provider Dashboard  |  Data Consumer Dashboard  |  Compute Provider Mgmt  |  Auditor Panel',
            ha='center', va='center', **FONT_SMALL)

    # Arrow L7 -> L6
    draw_arrow(ax, 0.5, y, 0.5, y - arrow_gap)
    y -= arrow_gap

    # --- Layer 6: API & Application Logic (full width) ---
    y -= layer_h
    draw_box(ax, margin, y, full_w, layer_h, facecolor=COLORS['primary'])
    ax.text(margin + full_w / 2, y + layer_h * 0.70,
            'Layer 6: API & Application Logic', ha='center', va='center', **FONT_HEADING)
    ax.text(margin + full_w / 2, y + layer_h * 0.30,
            'Authentication  |  Job Management  |  Algorithm Upload  |  Wallet Integration  |  Health Monitoring',
            ha='center', va='center', **FONT_SMALL)

    # Branching arrows L6 -> L5 (left) and L6 -> L4 (right)
    l5_cx = margin + half_w / 2
    l4_cx = margin + half_w + GAP_BETWEEN + half_w / 2
    draw_arrow(ax, l5_cx, y, l5_cx, y - arrow_gap)
    draw_arrow(ax, l4_cx, y, l4_cx, y - arrow_gap)
    y -= arrow_gap

    # --- Layer 5 (left) & Layer 4 (right) ---
    l4_h = layer_h * 1.6       # taller to fit 3 lines of contracts
    l5_x = margin
    l4_x = margin + half_w + GAP_BETWEEN

    # L5 — tops aligned with y, but shorter than L4
    draw_box(ax, l5_x, y - layer_h, half_w, layer_h, facecolor=COLORS['accent'])
    ax.text(l5_x + half_w / 2, y - layer_h + layer_h * 0.70,
            'Layer 5: SMPC Coordinator', ha='center', va='center', **FONT_HEADING)
    ax.text(l5_x + half_w / 2, y - layer_h + layer_h * 0.30,
            'Job Orchestration  |  Node Management  |  Secret Sharing',
            ha='center', va='center', **FONT_SMALL)

    # L4 — tops aligned with y
    draw_box(ax, l4_x, y - l4_h, half_w, l4_h, facecolor=COLORS['accent'])
    ax.text(l4_x + half_w / 2, y - l4_h + l4_h * 0.82,
            'Layer 4: Smart Contract Layer', ha='center', va='center', **FONT_HEADING)
    contracts = ('DataRegistry  |  ComputingRequest  |  FeeManagement\n'
                 'SMPCProtocol  |  ApprovalManager  |  PrivacyCompliance\n'
                 'PaymentDistributor')
    ax.text(l4_x + half_w / 2, y - l4_h + l4_h * 0.38,
            contracts, ha='center', va='center', **FONT_SMALL, linespacing=1.5)

    # Move y past the taller box (L4)
    y -= l4_h

    # Arrows L5/L4 -> L3
    draw_arrow(ax, l5_cx, y, l5_cx, y - arrow_gap)
    draw_arrow(ax, l4_cx, y, l4_cx, y - arrow_gap)
    y -= arrow_gap

    # --- Layer 3: SMPC Computation Nodes ---
    l3_h = 0.095
    l3_x = margin + 0.02
    l3_w = full_w - 0.04
    y -= l3_h
    draw_box(ax, l3_x, y, l3_w, l3_h, facecolor=COLORS['primary'])
    ax.text(0.5, y + l3_h - PAD_BOX,
            'Layer 3: SMPC Computation Nodes', ha='center', va='top', **FONT_HEADING)

    # Inner node sub-boxes
    node_w = 0.15
    node_h = 0.035
    node_y = y + PAD_BOX
    node_gap = 0.06
    total_nodes_w = 3 * node_w + 2 * node_gap
    node_x_start = 0.5 - total_nodes_w / 2
    node_labels = ['Node 1\nMP-SPDZ :9991', 'Node 2\nMP-SPDZ :9992', 'Node N\nMP-SPDZ :999N']
    for i, nlabel in enumerate(node_labels):
        nx = node_x_start + i * (node_w + node_gap)
        draw_box(ax, nx, node_y, node_w, node_h, nlabel,
                 facecolor=COLORS['secondary'], fontdict=FONT_SMALL, zorder=4)

    # Arrows L3 -> bottom layers
    for tx in [0.22, 0.50, 0.78]:
        draw_arrow(ax, tx, y, tx, y - arrow_gap)
    y -= arrow_gap

    # --- Bottom: L2, L1, L0 side-by-side ---
    third_w = 0.26
    bottom_h = 0.080
    gap3 = (full_w - 3 * third_w) / 2
    l2_x = margin
    l1_x = margin + third_w + gap3
    l0_x = margin + 2 * (third_w + gap3)

    y -= bottom_h
    layers_bottom = [
        (l2_x, 'Layer 2: Storage', 'Redis (Cache)\nMongoDB (DB)\nIPFS (Files)'),
        (l1_x, 'Layer 1: Blockchain', 'Ethereum L2\nChain ID: 1337\nLocal / Sepolia'),
        (l0_x, 'Layer 0: Network', 'ZK-Rollup\nIPFS Gateway\nWebSocket'),
    ]
    for bx, title, body in layers_bottom:
        draw_box(ax, bx, y, third_w, bottom_h, facecolor=COLORS['primary'])
        ax.text(bx + third_w / 2, y + bottom_h * 0.78,
                title, ha='center', va='center', **FONT_HEADING)
        ax.text(bx + third_w / 2, y + bottom_h * 0.32,
                body, ha='center', va='center', **FONT_SMALL, linespacing=1.3)

    save_figure(fig, 'fig-4-1-seven-layer-arch.png')


# ── Diagram 2: Contract Interaction Flow ─────────────────────────────────────

def generate_contract_interaction():
    """Fig 4.2: Smart Contract Interaction Diagram."""
    fig, ax = setup_figure((10, 12), 'Smart Contract Interaction Flow')

    box_w = 0.22
    box_h = 0.050
    cx = 0.5
    row_gap = 0.035   # vertical gap between box bottom and next arrow start
    arrow_h = 0.030   # arrow shaft length

    # Row 1: User Actions
    y = 0.88
    draw_box(ax, cx - box_w / 2, y, box_w, box_h, 'User Actions',
             facecolor=COLORS['highlight'], fontdict=FONT_HEADING)

    # Arrow
    draw_arrow(ax, cx, y, cx, y - arrow_h)
    y -= arrow_h

    # Row 2: DataProvider -> DataRegistry <- ComputingRequest <- DataConsumer
    y -= row_gap
    bw2 = 0.18
    dp_x = 0.03
    dr_x = 0.25
    cr_x = 0.55
    dc_x = 0.79

    draw_box(ax, dp_x, y, bw2, box_h, 'DataProvider',
             facecolor=COLORS['accent'], fontdict=FONT_BODY)
    draw_box(ax, dr_x, y, bw2, box_h, 'DataRegistry',
             facecolor=COLORS['primary'], fontdict=FONT_BODY)
    draw_box(ax, cr_x, y, bw2, box_h, 'ComputingRequest',
             facecolor=COLORS['primary'], fontdict=FONT_BODY)
    draw_box(ax, dc_x, y, bw2, box_h, 'DataConsumer',
             facecolor=COLORS['accent'], fontdict=FONT_BODY)

    # Horizontal arrows with gap
    draw_arrow(ax, dp_x + bw2 + 0.008, y + box_h / 2, dr_x - 0.008, y + box_h / 2)
    draw_arrow(ax, dc_x - 0.008, y + box_h / 2, cr_x + bw2 + 0.008, y + box_h / 2)

    # Diagonal arrows -> FeeManagement
    y_top_diag = y
    y -= arrow_h + row_gap + box_h  # skip arrow+gap+box_h
    draw_box(ax, cx - box_w / 2, y, box_w, box_h, 'FeeManagement',
             facecolor=COLORS['primary'], fontdict=FONT_BODY)
    draw_arrow(ax, dr_x + bw2 / 2, y_top_diag, cx - 0.04, y + box_h + 0.008)
    draw_arrow(ax, cr_x + bw2 / 2, y_top_diag, cx + 0.04, y + box_h + 0.008)

    # Arrow -> SMPCProtocol
    draw_arrow(ax, cx, y, cx, y - arrow_h)
    y -= arrow_h + row_gap
    draw_box(ax, cx - box_w / 2, y, box_w, box_h, 'SMPCProtocol',
             facecolor=COLORS['primary'], fontdict=FONT_BODY)

    # Arrow -> PaymentDistributor
    draw_arrow(ax, cx, y, cx, y - arrow_h)
    y -= arrow_h + row_gap
    draw_box(ax, cx - box_w / 2, y, box_w, box_h, 'PaymentDistributor',
             facecolor=COLORS['primary'], fontdict=FONT_BODY)

    # Arrow -> Participants
    draw_arrow(ax, cx, y, cx, y - arrow_h)
    y -= arrow_h + row_gap
    draw_box(ax, cx - 0.16, y, 0.32, box_h, 'Participants receive payments',
             facecolor=COLORS['highlight'], fontdict=FONT_BODY)

    save_figure(fig, 'fig-4-2-contract-interaction.png')


# ── Diagram 3: Five-Tier Architecture ────────────────────────────────────────

def generate_five_tier():
    """Fig 5.1: Five-Tier System Architecture with Component Relationships."""
    fig, ax = setup_figure((14, 22))
    ax.text(0.5, 0.99, 'Five-Tier System Architecture',
            ha='center', va='top', **FONT_TITLE)

    margin = 0.05
    full_w = 0.90
    comp_h = 0.032
    comp_gap = GAP_INNER
    inner_pad = 0.020     # padding inside tier box around components

    y = 0.95  # cursor

    def draw_tier_header(y_top, title, h):
        """Draw tier outer box + header bar. Returns content_top_y."""
        header_h = 0.022
        draw_box(ax, margin, y_top - h, full_w, h,
                 facecolor=COLORS['primary'], linewidth=2, zorder=1)
        draw_box(ax, margin, y_top - header_h, full_w, header_h,
                 label=title, facecolor=COLORS['tier_header'],
                 fontdict={**FONT_HEADING, 'fontsize': 10, 'color': '#FFFFFF'},
                 linewidth=0, zorder=3)
        return y_top - header_h - inner_pad

    def draw_comp_row(y_top, labels):
        """Draw a row of component sub-boxes. Returns y below the row."""
        inner_x = margin + inner_pad
        inner_w = full_w - 2 * inner_pad
        n = len(labels)
        cw = (inner_w - (n - 1) * comp_gap) / n
        for i, label in enumerate(labels):
            cx = inner_x + i * (cw + comp_gap)
            draw_box(ax, cx, y_top - comp_h, cw, comp_h, label,
                     facecolor=COLORS['secondary'],
                     fontdict=FONT_SMALL, zorder=4)
        return y_top - comp_h - comp_gap

    def draw_text_row(y_top, text):
        """Draw a centered text label. Returns y below."""
        ax.text(margin + full_w / 2, y_top - comp_h / 2,
                text, ha='center', va='center', **FONT_SMALL, zorder=4)
        return y_top - comp_h - comp_gap

    def tier_connector(y_pos, label=''):
        mid = margin + full_w / 2
        draw_arrow(ax, mid, y_pos, mid, y_pos - GAP_TIER + 0.010)
        if label:
            ax.text(mid + 0.015, y_pos - GAP_TIER / 2 + 0.005, label,
                    ha='left', va='center', **FONT_SMALL)

    # ── Tier 1: Presentation ──
    t1_h = 0.095
    content_y = draw_tier_header(y, 'PRESENTATION TIER (Client-Side)', t1_h)
    content_y = draw_comp_row(content_y, [
        'Data Provider\nDashboard', 'Data Consumer\nInterface',
        'Auditor\nDashboard', 'Compute Node\nManagement'])
    draw_text_row(content_y, 'React Query (Server State)  |  Zustand (Client State)  |  Wagmi (Web3)  |  Viem (Ethereum)')

    tier_connector(y - t1_h, 'HTTPS / WSS')
    y = y - t1_h - GAP_TIER

    # ── Tier 2: Application ──
    t2_h = 0.095
    content_y = draw_tier_header(y, 'APPLICATION TIER (Next.js API Routes)', t2_h)
    content_y = draw_comp_row(content_y, [
        '/api/data\nRegistry', '/api/compute\nRequests',
        '/api/auth\nJWT Tokens', '/api/status\nWebSocket'])
    draw_text_row(content_y, 'Authentication Middleware (JWT)  |  Rate Limiting (Redis)  |  Input Validation (Zod)')

    tier_connector(y - t2_h)
    y = y - t2_h - GAP_TIER

    # ── Tier 3: Business Logic (complex) ──
    t3_h = 0.185
    header_h = 0.022
    draw_box(ax, margin, y - t3_h, full_w, t3_h,
             facecolor=COLORS['primary'], linewidth=2, zorder=1)
    draw_box(ax, margin, y - header_h, full_w, header_h,
             label='BUSINESS LOGIC TIER (Distributed Services)',
             facecolor=COLORS['tier_header'],
             fontdict={**FONT_HEADING, 'fontsize': 10, 'color': '#FFFFFF'},
             linewidth=0, zorder=3)

    inner_x = margin + inner_pad
    inner_w = full_w - 2 * inner_pad

    # Row 1: 4 service boxes
    svc_y_top = y - header_h - inner_pad
    svc_labels = ['Blockchain Layer\n(L2 Smart Contracts)', 'SMPC Coordinator\n(Node.js, Port 8080)',
                  'Storage Manager\n(IPFS Gateway)', 'Job Queue\n(Redis Bull)']
    n = 4
    cw = (inner_w - (n - 1) * comp_gap) / n
    svc_centers = []
    for i, label in enumerate(svc_labels):
        sx = inner_x + i * (cw + comp_gap)
        draw_box(ax, sx, svc_y_top - comp_h, cw, comp_h, label,
                 facecolor=COLORS['secondary'], fontdict=FONT_SMALL, zorder=4)
        svc_centers.append(sx + cw / 2)

    # Row 2: sub-services with arrows
    row2_y_top = svc_y_top - comp_h - comp_gap * 2.5
    r2_h = comp_h * 1.15
    r2_specs = [
        ('Hardhat Node\nPort 8545', 0.17),
        ('MP-SPDZ Node Cluster\nN1 | N2 | N3  (Ports 9991-9993)', 0.40),
        ('Redis Pub/Sub\nReal-time Events', 0.21),
    ]
    r2_gap = 0.015
    r2_total = sum(w for _, w in r2_specs) + (len(r2_specs) - 1) * r2_gap
    r2_x = 0.5 - r2_total / 2
    r2_centers = []
    for label, w in r2_specs:
        draw_box(ax, r2_x, row2_y_top - r2_h, w, r2_h, label,
                 facecolor=COLORS['accent'], fontdict=FONT_SMALL, zorder=4)
        r2_centers.append(r2_x + w / 2)
        r2_x += w + r2_gap

    # Arrows from row1 to row2
    draw_arrow(ax, svc_centers[0], svc_y_top - comp_h, r2_centers[0], row2_y_top)
    draw_arrow(ax, svc_centers[1], svc_y_top - comp_h, r2_centers[1], row2_y_top)
    draw_arrow(ax, svc_centers[3], svc_y_top - comp_h, r2_centers[2], row2_y_top)

    tier_connector(y - t3_h)
    y = y - t3_h - GAP_TIER

    # ── Tier 4: Data Persistence ──
    t4_h = 0.095
    content_y = draw_tier_header(y, 'DATA PERSISTENCE TIER', t4_h)
    content_y = draw_comp_row(content_y, [
        'MongoDB\n(Documents)\nPort 27017', 'Redis\n(Cache)\nPort 6379',
        'IPFS\n(Files/Blobs)\nPorts 4001, 5001', 'Blockchain\n(Metadata)\nImmutable Ledger'])
    draw_text_row(content_y, 'Data Models: Users, DataAssets, ComputeJobs, AuditLogs')

    tier_connector(y - t4_h)
    y = y - t4_h - GAP_TIER

    # ── Tier 5: Infrastructure ──
    t5_h = 0.075
    content_y = draw_tier_header(y, 'INFRASTRUCTURE TIER (Docker)', t5_h)
    content_y = draw_text_row(content_y, 'Docker Compose Network (172.20.0.0/16)')
    draw_text_row(content_y,
        'Named Volumes: mongodb-data, redis-data, ipfs-data, logs  |  Health Checks: 30s  |  Restart: unless-stopped')

    save_figure(fig, 'fig-5-1-five-tier-arch.png')


# ── Diagram 4: 14-Step Sequence Diagram ──────────────────────────────────────

def generate_sequence():
    """Fig 5.2: Sequence Diagram for Computation Request Lifecycle (14 Steps)."""
    fig, ax = setup_figure((14, 18))
    ax.text(0.5, 0.99, 'Sequence Diagram: Computation Request Lifecycle (14 Steps)',
            ha='center', va='top', **FONT_TITLE)

    actors = ['Data\nConsumer', 'Next.js\nAPI', 'Smart\nContract', 'SMPC\nCoordinator', 'MP-SPDZ\nNodes']
    x_positions = [0.10, 0.30, 0.50, 0.70, 0.90]

    # Actor boxes
    box_w = 0.13
    box_h = 0.040
    top_y = 0.95
    lifeline_top = top_y - box_h - 0.008  # gap below actor box
    lifeline_bottom = 0.03

    for actor, xp in zip(actors, x_positions):
        draw_box(ax, xp - box_w / 2, top_y - box_h, box_w, box_h, actor,
                 facecolor=COLORS['accent'], fontdict={**FONT_BODY, 'fontsize': 8})

    # Lifelines
    for xp in x_positions:
        ax.plot([xp, xp], [lifeline_top, lifeline_bottom],
                linestyle='--', color=COLORS['border'], linewidth=0.8,
                zorder=1, alpha=0.5)

    steps = [
        (0, 1, 'Submit Query', 'HTTP POST', 1),
        (1, 2, 'Validate Request', '', 2),
        (2, 1, 'Access Granted', 'On-chain verify', None),
        (1, 2, 'Lock Funds', 'Smart contract', 3),
        (2, 1, 'PaymentLocked', 'Event Emitted', None),
        (1, 3, 'Queue Job', 'Redis Bull', 4),
        (1, 0, 'Job ID Returned', '202 Accepted', 5),
        (3, 2, 'Listen Event', 'Blockchain', 6),
        (3, 4, 'Fetch Shares', 'From IPFS', 7),
        (4, 3, 'Encrypted Data', '', None),
        (3, 4, 'Execute MPC', 'Shamir SSS', 8),
        (4, -1, 'Compute (30-120s)', '', 9),
        (4, 3, 'Result Shares', '', None),
        (3, 2, 'Reconstruct Result', '+ ZK Proof', 10),
        (2, 3, 'Verify + Distribute $', '', 11),
        (2, 1, 'JobComplete', 'WebSocket Event', 12),
        (1, 0, 'Notify Client', 'Real-time update', 13),
        (0, 1, 'Fetch Result', 'HTTP GET', 14),
        (1, 0, 'Result + Proof', '', None),
    ]

    y_step = lifeline_top - 0.012
    step_gap = 0.042

    for from_idx, to_idx, label, sublabel, step_num in steps:
        if to_idx == -1:
            xp = x_positions[from_idx]
            ax.annotate('', xy=(xp + 0.005, y_step - 0.018),
                        xytext=(xp + 0.005, y_step),
                        arrowprops=dict(arrowstyle='->', color=COLORS['arrow'],
                                        linewidth=1.2,
                                        connectionstyle='arc3,rad=-0.8'))
            step_label = f'{step_num}. {label}' if step_num else label
            ax.text(xp + 0.050, y_step - 0.006, step_label,
                    ha='left', va='center', fontsize=7, color=COLORS['heading'],
                    fontfamily='sans-serif', fontweight='bold')
        else:
            x1 = x_positions[from_idx]
            x2 = x_positions[to_idx]
            draw_arrow(ax, x1, y_step, x2, y_step, linewidth=1.2)

            mid_x = (x1 + x2) / 2
            step_label = f'{step_num}. {label}' if step_num else label
            ax.text(mid_x, y_step + 0.010, step_label,
                    ha='center', va='bottom', fontsize=7, color=COLORS['heading'],
                    fontfamily='sans-serif', fontweight='bold')
            if sublabel:
                ax.text(mid_x, y_step - 0.010, f'({sublabel})',
                        ha='center', va='top', **FONT_SMALL)

        y_step -= step_gap

    save_figure(fig, 'fig-5-2-sequence-diagram.png')


# ── Diagram 5: Contract Architecture Tree ────────────────────────────────────

def generate_contract_tree():
    """Fig 5.3: Contract Interaction Architecture."""
    fig, ax = setup_figure((10, 9), 'Contract Interaction Architecture')

    box_w = 0.22
    box_h = 0.09
    cx = 0.5

    # Top: ComputingRequest
    y1 = 0.80
    draw_box(ax, cx - box_w / 2, y1, box_w, box_h, facecolor=COLORS['accent'])
    ax.text(cx, y1 + box_h * 0.65, 'ComputingRequest', ha='center', va='center', **FONT_HEADING)
    ax.text(cx, y1 + box_h * 0.30, '(Orchestrator)', ha='center', va='center', **FONT_SMALL)

    # Three branches — generous vertical gap
    y2 = 0.46
    branch_gap = 0.04
    total_w = 3 * box_w + 2 * branch_gap
    branch_x_start = 0.5 - total_w / 2
    branch_labels = [
        ('DataRegistry', '(Data Catalog)'),
        ('FeeManagement', '(Payments)'),
        ('ApprovalMgr', '(GDPR Consent)'),
    ]

    for i, (lbl, sub) in enumerate(branch_labels):
        bx = branch_x_start + i * (box_w + branch_gap)
        draw_box(ax, bx, y2, box_w, box_h, facecolor=COLORS['primary'])
        ax.text(bx + box_w / 2, y2 + box_h * 0.65, lbl, ha='center', va='center', **FONT_HEADING)
        ax.text(bx + box_w / 2, y2 + box_h * 0.30, sub, ha='center', va='center', **FONT_SMALL)
        draw_arrow(ax, cx, y1, bx + box_w / 2, y2 + box_h + 0.008)

    # Bottom: PrivacyCompliance
    y3 = 0.14
    draw_box(ax, cx - box_w / 2, y3, box_w, box_h, facecolor=COLORS['accent'])
    ax.text(cx, y3 + box_h * 0.65, 'PrivacyCompliance', ha='center', va='center', **FONT_HEADING)
    ax.text(cx, y3 + box_h * 0.30, '(Audit Trails)', ha='center', va='center', **FONT_SMALL)

    for i in range(3):
        bx = branch_x_start + i * (box_w + branch_gap)
        draw_arrow(ax, bx + box_w / 2, y2, cx, y3 + box_h + 0.008)

    save_figure(fig, 'fig-5-3-contract-arch-tree.png')


# ── Diagram 6: SMPC Coordinator Service Architecture (Appendix 10) ────────

def generate_coordinator_arch():
    """Appendix 10: SMPC Coordinator Service Architecture."""
    fig, ax = setup_figure((12, 10), 'SMPC Coordinator Service Architecture')

    cx = 0.5
    outer_x = 0.08
    outer_w = 0.84
    outer_top = 0.85
    outer_h = 0.38
    outer_bottom = outer_top - outer_h
    header_h = 0.035
    inner_pad = 0.025

    # Outer box + header
    draw_box(ax, outer_x, outer_bottom, outer_w, outer_h,
             facecolor=COLORS['primary'], linewidth=2, zorder=1)
    draw_box(ax, outer_x, outer_top - header_h, outer_w, header_h,
             label='SMPC Coordinator (Port 8080)',
             facecolor=COLORS['tier_header'],
             fontdict={**FONT_HEADING, 'color': '#FFFFFF'},
             linewidth=0, zorder=3)

    # Row 1: 3 service boxes
    svc_w = 0.22
    svc_h = 0.070
    svc_gap = 0.030
    svc_y_top = outer_top - header_h - inner_pad
    total_svc_w = 3 * svc_w + 2 * svc_gap
    svc_x_start = 0.5 - total_svc_w / 2
    svcs = [
        ('Event Listener', '(Blockchain)'),
        ('Job Scheduler', '(Redis Bull)'),
        ('Health Monitor', '(Node Status)'),
    ]
    svc_centers = []
    for i, (lbl, sub) in enumerate(svcs):
        sx = svc_x_start + i * (svc_w + svc_gap)
        sy = svc_y_top - svc_h
        draw_box(ax, sx, sy, svc_w, svc_h, facecolor=COLORS['secondary'], zorder=4)
        ax.text(sx + svc_w / 2, sy + svc_h * 0.65, lbl,
                ha='center', va='center', zorder=5,
                fontsize=9, fontweight='bold', color=COLORS['heading'], fontfamily='sans-serif')
        ax.text(sx + svc_w / 2, sy + svc_h * 0.28, sub,
                ha='center', va='center', zorder=5, **FONT_SMALL)
        svc_centers.append(sx + svc_w / 2)

    # Engine box
    engine_w = outer_w - 2 * inner_pad
    engine_h = 0.085
    engine_x = outer_x + inner_pad
    engine_y_top = svc_y_top - svc_h - inner_pad
    engine_y = engine_y_top - engine_h

    draw_box(ax, engine_x, engine_y, engine_w, engine_h,
             facecolor=COLORS['accent'], zorder=4)
    ax.text(engine_x + engine_w / 2, engine_y + engine_h * 0.68,
            'MP-SPDZ Protocol Execution Engine',
            ha='center', va='center', zorder=5, **FONT_HEADING)
    ax.text(engine_x + engine_w / 2, engine_y + engine_h * 0.30,
            'Share Distribution  |  Computation Orchestration  |  Result Aggregation  |  ZK Proof Generation',
            ha='center', va='center', zorder=5, **FONT_SMALL)

    # Arrows svc -> engine
    for sc in svc_centers:
        draw_arrow(ax, sc, svc_y_top - svc_h, sc, engine_y_top)

    # Below outer box: arrow + label + 3 nodes
    arrow_bottom = outer_bottom - GAP_ARROW
    draw_arrow(ax, cx, outer_bottom, cx, arrow_bottom)
    ax.text(cx + 0.06, (outer_bottom + arrow_bottom) / 2, 'gRPC Communication',
            ha='left', va='center', zorder=5,
            fontsize=8, fontstyle='italic', color=COLORS['detail'], fontfamily='sans-serif')

    node_w = 0.15
    node_h = 0.065
    node_gap = 0.050
    node_y_top = arrow_bottom - 0.015
    total_node_w = 3 * node_w + 2 * node_gap
    node_x_start = 0.5 - total_node_w / 2
    node_labels = [('Node 1', 'Port 9991'), ('Node 2', 'Port 9992'), ('Node 3', 'Port 9993')]

    for i, (nlbl, nport) in enumerate(node_labels):
        nx = node_x_start + i * (node_w + node_gap)
        ny = node_y_top - node_h
        draw_box(ax, nx, ny, node_w, node_h, facecolor=COLORS['secondary'], zorder=4)
        ax.text(nx + node_w / 2, ny + node_h * 0.65, nlbl,
                ha='center', va='center', zorder=5,
                fontsize=9, fontweight='bold', color=COLORS['heading'], fontfamily='sans-serif')
        ax.text(nx + node_w / 2, ny + node_h * 0.28, nport,
                ha='center', va='center', zorder=5, **FONT_SMALL)
        draw_arrow(ax, cx, arrow_bottom, nx + node_w / 2, node_y_top)

    save_figure(fig, 'fig-a10-coordinator-arch.png')


# ── Main ─────────────────────────────────────────────────────────────────────

DIAGRAMS = {
    'seven-layer': generate_seven_layer,
    'contract-interaction': generate_contract_interaction,
    'five-tier': generate_five_tier,
    'sequence': generate_sequence,
    'contract-tree': generate_contract_tree,
    'coordinator-arch': generate_coordinator_arch,
}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate thesis diagrams.')
    parser.add_argument('--all', action='store_true', help='Generate all diagrams')
    parser.add_argument('--diagram', type=str, choices=list(DIAGRAMS.keys()),
                        help='Generate a specific diagram')
    args = parser.parse_args()

    if not args.all and not args.diagram:
        parser.print_help()
        exit(1)

    targets = DIAGRAMS if args.all else {args.diagram: DIAGRAMS[args.diagram]}

    print(f"Generating {len(targets)} diagram(s)...")
    for name, func in targets.items():
        print(f"  [{name}]")
        func()
    print("Done.")
