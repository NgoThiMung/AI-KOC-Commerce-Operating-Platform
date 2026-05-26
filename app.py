import os
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st


DEFAULT_INPUT_PATH = Path("output/koc_report_processed.xlsx")
EXPECTED_SHEETS = [
    "DASHBOARD_DATA",
    "TOP10_KOC_GMV",
    "TOP10_KOC_VIDEO",
    "TOP10_KOC_LIVE",
    "TOP10_SHOP",
    "TOP10_PRODUCT",
    "KOC_SEGMENTATION",
    "VIDEO_LIVE_COMPARISON",
    "INSIGHTS",
]


@st.cache_data(show_spinner=False)
def load_report(path: Path) -> dict:
    """Load all sheets from the processed Excel report."""
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file báo cáo: {path}")

    data = pd.read_excel(path, sheet_name=None)
    missing = [sheet for sheet in EXPECTED_SHEETS if sheet not in data]
    return {"sheets": data, "path": path, "missing": missing}


def inject_styles():
    st.markdown(
        """
        <style>
            .stApp {
                background: linear-gradient(180deg, #071224 0%, #0f172a 100%);
                color: #f8fafc;
            }
            .stSidebar {
                background-color: #020617;
            }
            .stButton>button {
                border-radius: 999px;
            }
            .metric-card {
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(148, 163, 184, 0.18);
                border-radius: 24px;
                padding: 18px;
                box-shadow: 0 12px 30px rgba(15, 23, 42, 0.35);
            }
            .section-title {
                color: #e2e8f0;
                font-size: 24px;
                margin-bottom: 10px;
                letter-spacing: 0.2px;
            }
            .section-subtitle {
                color: #94a3b8;
                margin-bottom: 24px;
            }
            .insight-card {
                background: rgba(15, 23, 42, 0.94);
                border-radius: 20px;
                padding: 20px;
                margin-bottom: 16px;
                border: 1px solid rgba(148, 163, 184, 0.16);
                box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
            }
            .workflow-table th {
                color: #cbd5e1;
                padding: 12px 10px;
            }
            .workflow-table td {
                padding: 12px 10px;
                color: #e2e8f0;
            }
            .data-status {
                color: #94a3b8;
                font-size: 14px;
                margin-top: -16px;
                margin-bottom: 18px;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def format_kpi(value):
    if pd.isna(value) or value is None:
        return "N/A"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f"{value:,.0f}"
    return str(value)


def parse_dashboard_metrics(dashboard: pd.DataFrame) -> dict:
    metrics = {}
    if dashboard is None or dashboard.empty:
        return metrics

    if set(["Metric", "Value"]).issubset(dashboard.columns):
        raw = dict(zip(dashboard["Metric"].astype(str).str.strip(), dashboard["Value"]))
        translation = {
            "Tổng GMV": "Total GMV",
            "Tổng doanh thu": "Total GMV",
            "Tổng đơn hàng": "Orders",
            "Số đơn": "Orders",
            "GMV VIDEO": "Video GMV",
            "Video GMV": "Video GMV",
            "GMV LIVE": "LIVE GMV",
            "AOV": "AOV",
            "Tổng KOC": "Total KOC",
            "Tổng Shop": "Total Shop",
            "Tổng Product": "Total Product",
        }
        for key, value in raw.items():
            canonical = translation.get(key, key)
            metrics[canonical] = value
    else:
        for col in dashboard.columns:
            if pd.api.types.is_numeric_dtype(dashboard[col]):
                metrics[col] = dashboard[col].iloc[0]
    return metrics


def get_sheet_safe(sheets: dict, name: str) -> pd.DataFrame:
    return sheets.get(name, pd.DataFrame())


def render_table_preview(df: pd.DataFrame, title: str):
    st.markdown(f"### {title}")
    if df is None or df.empty:
        st.info("Không có dữ liệu để hiển thị.")
        return
    st.dataframe(df.reset_index(drop=True), use_container_width=True)


def build_grouped_bar_chart(df: pd.DataFrame, x_col: str, value_cols: list, title: str, top_n: int = 10):
    if df is None or df.empty or x_col not in df.columns:
        return None
    used = [col for col in value_cols if col in df.columns]
    if not used:
        return None
    if "Total_GMV" in df.columns and not df[x_col].isnull().all():
        chart_df = df.sort_values("Total_GMV", ascending=False).head(top_n)
    else:
        chart_df = df.head(top_n)
    melt = chart_df.melt(id_vars=[x_col], value_vars=used, var_name="Type", value_name="Value")
    fig = px.bar(
        melt,
        x=x_col,
        y="Value",
        color="Type",
        title=title,
        template="plotly_dark",
        barmode="group",
        text="Value",
    )
    fig.update_traces(texttemplate="%{text:,.0f}", textposition="outside")
    fig.update_layout(
        plot_bgcolor="#0f172a",
        paper_bgcolor="#0f172a",
        font_color="#e2e8f0",
        xaxis_tickangle=-45,
        margin=dict(t=50, b=50, l=20, r=20),
    )
    return fig


def build_segment_donut_chart(df: pd.DataFrame, title: str):
    if df is None or df.empty or "Segment" not in df.columns or "Total_GMV" not in df.columns:
        return None
    summary = df.groupby("Segment", dropna=False)["Total_GMV"].sum().reset_index()
    summary = summary.sort_values("Total_GMV", ascending=False)
    fig = px.pie(
        summary,
        names="Segment",
        values="Total_GMV",
        title=title,
        hole=0.45,
        template="plotly_dark",
    )
    fig.update_layout(
        plot_bgcolor="#0f172a",
        paper_bgcolor="#0f172a",
        font_color="#e2e8f0",
        margin=dict(t=50, b=50, l=20, r=20),
    )
    return fig


def render_kpi_cards(metrics: dict):
    kpi_labels = [
        ("Total GMV", "Total GMV"),
        ("Video GMV", "Video GMV"),
        ("LIVE GMV", "GMV LIVE"),
        ("Orders", "Orders"),
        ("AOV", "AOV"),
        ("Total KOC", "Total KOC"),
        ("Total Shop", "Total Shop"),
        ("Total Product", "Total Product"),
    ]

    cards = []
    for label, key in kpi_labels:
        cards.append((label, metrics.get(key, metrics.get(label, "N/A"))))

    cols = st.columns(4)
    for idx, (label, value) in enumerate(cards):
        with cols[idx % 4]:
            st.markdown("<div class='metric-card'>", unsafe_allow_html=True)
            st.markdown(f"<div style='color:#94a3b8;font-size:13px;margin-bottom:6px;'>{label}</div>")
            st.markdown(f"<div style='font-size:30px;font-weight:700;line-height:1.1;'>{format_kpi(value)}</div>")
            st.markdown("</div>", unsafe_allow_html=True)
            st.write(" ")


def render_data_status(sheets: dict, missing: list):
    st.markdown("### Report status")
    if missing:
        st.warning(f"Thiếu sheet: {', '.join(missing)}.")
    loaded = [sheet for sheet in EXPECTED_SHEETS if sheet in sheets]
    st.markdown(f"<div class='data-status'>Đã tải {len(loaded)} sheet: {', '.join(loaded)}</div>", unsafe_allow_html=True)


def build_bar_chart(df: pd.DataFrame, x_col: str, y_col: str, title: str, color_col: str = None):
    if x_col not in df.columns or y_col not in df.columns:
        return None
    fig = px.bar(
        df,
        x=x_col,
        y=y_col,
        color=color_col if color_col and color_col in df.columns else y_col,
        title=title,
        template="plotly_dark",
        text=y_col,
    )
    fig.update_traces(texttemplate="%{text:,.0f}", textposition="outside")
    fig.update_layout(
        plot_bgcolor="#0f172a",
        paper_bgcolor="#0f172a",
        font_color="#e2e8f0",
        xaxis_tickangle=-45,
        margin=dict(t=50, b=50, l=20, r=20),
    )
    return fig


def build_donut_chart(df: pd.DataFrame, names_col: str, values_col: str, title: str):
    if names_col not in df.columns or values_col not in df.columns:
        return None
    fig = px.pie(
        df,
        names=names_col,
        values=values_col,
        title=title,
        hole=0.45,
        template="plotly_dark",
    )
    fig.update_layout(
        plot_bgcolor="#0f172a",
        paper_bgcolor="#0f172a",
        font_color="#e2e8f0",
        margin=dict(t=50, b=50, l=20, r=20),
    )
    return fig


def render_insights(insights_df: pd.DataFrame):
    st.markdown("<div class='section-title'>AI Insights</div>", unsafe_allow_html=True)
    if insights_df is None or insights_df.empty:
        st.info("Không có insight để hiển thị.")
        return

    insight_col = insights_df.columns[0]
    for _, row in insights_df.iterrows():
        text = str(row.get(insight_col, "")).strip()
        if text:
            st.markdown(
                f"<div class='insight-card'><strong>Insight</strong><p style='margin:8px 0 0 0;color:#cbd5e1;'>{text}</p></div>",
                unsafe_allow_html=True,
            )


def render_automation_table():
    st.markdown("<div class='section-title'>AI Automation Opportunities</div>", unsafe_allow_html=True)
    automation_data = [
        [
            "Manual KOC discovery and scoring",
            "AI scoring engine identifies top KOC by performance, fit and engagement.",
        ],
        [
            "Manual report writing",
            "AI generates narrative performance reports and recommendations automatically.",
        ],
        [
            "Manual realtime flagging",
            "Realtime analytics pipeline detects anomalies and campaign shifts instantly.",
        ],
        [
            "Manual KOC selection",
            "Recommendation engine suggests KOC combinations based on product and audience match.",
        ],
        [
            "Manual follow-up and communication",
            "AI chatbot automates KOC follow-up, reminders and performance coaching.",
        ],
        [
            "Manual campaign monitoring",
            "Automated monitoring alerts when metrics deviate from targets.",
        ],
    ]
    df = pd.DataFrame(automation_data, columns=["Current Process", "AI Solution"])
    st.table(df)


def render_workflow_redesign():
    st.markdown("<div class='section-title'>Workflow Redesign</div>", unsafe_allow_html=True)

    st.markdown("**Current workflow problems**")
    st.markdown(
        "- Báo cáo thủ công, dữ liệu không đồng bộ và độ trễ cao.\n"
        "- Phụ thuộc nhiều vào phân tích thủ công và các bảng tính.\n"
        "- Quyết định KOC thiếu thông tin về hiệu suất video vs LIVE.\n"
        "- Không có cơ chế cảnh báo tự động khi campaign lệch mục tiêu."
    )

    st.markdown("**Proposed AI-first workflow**")
    st.markdown(
        "- Tự động thu thập và làm sạch dữ liệu KOC hàng ngày.\n"
        "- AI scoring và phân khúc KOC theo hiệu suất.\n"
        "- Dashboard realtime cập nhật KPI, GMV video/LIVE và phân khúc.\n"
        "- Tự động tạo báo cáo kinh doanh bằng tiếng Việt.\n"
        "- Đề xuất KOC, chiến dịch và follow-up tự động."
    )

    st.markdown("**Automation opportunities**")
    st.markdown(
        "- Tự động phân loại KOC High/Medium/Low/No-sales.\n"
        "- Tự động phát hiện tập trung GMV và rủi ro phụ thuộc.\n"
        "- AI hướng dẫn chiến lược live stream và video content.\n"
        "- Tích hợp chatbot để giữ tương tác KOC và kích hoạt campaign."
    )


def display_section_header(title: str, subtitle: str = None):
    st.markdown(f"<div class='section-title'>{title}</div>", unsafe_allow_html=True)
    if subtitle:
        st.markdown(f"<div style='color:#94a3b8; margin-bottom:18px;'>{subtitle}</div>", unsafe_allow_html=True)


def main():
    st.set_page_config(
        page_title="AI-Powered KOC Commerce Analytics Platform",
        page_icon="🤖",
        layout="wide",
    )

    inject_styles()

    st.sidebar.title("Navigation")
    page = st.sidebar.radio(
        "Choose section",
        [
            "Overview",
            "KOC Analytics",
            "Video vs LIVE",
            "KOC Segmentation",
            "Shop Analytics",
            "Product Analytics",
            "AI Insights",
            "AI Automation Opportunities",
            "Workflow Redesign",
        ],
    )

    st.sidebar.markdown("---")
    st.sidebar.markdown("**Input file**")
    input_path = st.sidebar.text_input("Path to report", str(DEFAULT_INPUT_PATH))
    if st.sidebar.button("Load report") or "report" not in st.session_state:
        try:
            report = load_report(Path(input_path))
            st.session_state["report"] = report
        except Exception as exc:
            st.error(f"Không thể tải file: {exc}")
            return

    if "report" not in st.session_state:
        return

    report = st.session_state["report"]
    sheets = report["sheets"]
    path = report["path"]

    st.markdown(f"**Loaded file:** {path.name}")
    st.markdown("---")

    dashboard_df = get_sheet_safe(sheets, "DASHBOARD_DATA")
    insights_df = get_sheet_safe(sheets, "INSIGHTS")
    kok_segmentation_df = get_sheet_safe(sheets, "KOC_SEGMENTATION")
    video_live_df = get_sheet_safe(sheets, "VIDEO_LIVE_COMPARISON")
    top10_koc_gmv_df = get_sheet_safe(sheets, "TOP10_KOC_GMV")
    top10_koc_video_df = get_sheet_safe(sheets, "TOP10_KOC_VIDEO")
    top10_koc_live_df = get_sheet_safe(sheets, "TOP10_KOC_LIVE")
    top10_shop_df = get_sheet_safe(sheets, "TOP10_SHOP")
    top10_product_df = get_sheet_safe(sheets, "TOP10_PRODUCT")

    if report.get("missing"):
        st.warning(f"Thiếu sheet: {', '.join(report['missing'])}. Một số bảng có thể không hiển thị đầy đủ.")

    metrics = parse_dashboard_metrics(dashboard_df)

    if page == "Overview":
        display_section_header(
            "Executive Overview",
            "Dashboard tổng quan hiệu suất KOC thương mại điện tử dựa trên dữ liệu thực tế.",
        )
        render_data_status(sheets, report.get("missing", []))
        render_kpi_cards(metrics)

        st.markdown("---")
        st.markdown("### High-level performance")
        overview_cols = st.columns([2, 2, 1])
        with overview_cols[0]:
            if not top10_koc_gmv_df.empty:
                fig = build_bar_chart(top10_koc_gmv_df, "Tên nhà sáng tạo", "Doanh_thu", "Top 10 KOC GMV")
                if fig is not None:
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("Không thể hiển thị biểu đồ Top 10 KOC GMV.")
            else:
                st.info("Không có dữ liệu TOP10_KOC_GMV.")

        with overview_cols[1]:
            if not video_live_df.empty:
                fig = build_grouped_bar_chart(
                    video_live_df,
                    "Tên nhà sáng tạo",
                    ["Video_GMV", "Live_GMV"],
                    "Video vs LIVE GMV by Top KOC",
                    top_n=10,
                )
                if fig is not None:
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("Không thể hiển thị biểu đồ Video vs LIVE.")
            else:
                st.info("Không có dữ liệu VIDEO_LIVE_COMPARISON.")

        with overview_cols[2]:
            if not kok_segmentation_df.empty:
                seg_fig = build_segment_donut_chart(kok_segmentation_df, "KOC Segmentation by GMV")
                if seg_fig is not None:
                    st.plotly_chart(seg_fig, use_container_width=True)
                else:
                    st.info("Không thể hiển thị biểu đồ phân khúc KOC.")
            else:
                st.info("Không có dữ liệu KOC_SEGMENTATION.")

        st.markdown("---")
        st.markdown("### Recent insights")
        if not insights_df.empty:
            render_insights(insights_df)
        else:
            st.info("Không có insight trong sheet INSIGHTS.")

    elif page == "KOC Analytics":
        display_section_header(
            "KOC Analytics",
            "Phân tích hiệu suất creator và so sánh video/live theo KOC.",
        )
        if not top10_koc_gmv_df.empty:
            fig = build_bar_chart(top10_koc_gmv_df, "Tên nhà sáng tạo", "Doanh_thu", "Top 10 KOC GMV")
            if fig is not None:
                st.plotly_chart(fig, use_container_width=True)
            render_table_preview(top10_koc_gmv_df, "Top 10 KOC GMV")
        else:
            st.info("Không có dữ liệu TOP10_KOC_GMV.")

        if not top10_koc_video_df.empty:
            fig = build_bar_chart(top10_koc_video_df, "Tên nhà sáng tạo", "Doanh_thu", "Top 10 KOC Video")
            if fig is not None:
                st.plotly_chart(fig, use_container_width=True)
            render_table_preview(top10_koc_video_df, "Top 10 KOC Video")
        else:
            st.info("Không có dữ liệu TOP10_KOC_VIDEO.")

        if not top10_koc_live_df.empty:
            fig = build_bar_chart(top10_koc_live_df, "Tên nhà sáng tạo", "Doanh_thu", "Top 10 KOC LIVE")
            if fig is not None:
                st.plotly_chart(fig, use_container_width=True)
            render_table_preview(top10_koc_live_df, "Top 10 KOC LIVE")
        else:
            st.info("Không có dữ liệu TOP10_KOC_LIVE.")

    elif page == "Video vs LIVE":
        display_section_header(
            "Video vs LIVE Analytics",
            "So sánh doanh thu và tỷ lệ video/live cho mỗi KOC.",
        )
        if not video_live_df.empty:
            chart = build_grouped_bar_chart(
                video_live_df,
                "Tên nhà sáng tạo",
                ["Video_GMV", "Live_GMV"],
                "Video vs LIVE GMV by KOC",
                top_n=20,
            )
            if chart is not None:
                st.plotly_chart(chart, use_container_width=True)
            render_table_preview(video_live_df.sort_values("Total_GMV", ascending=False).head(20), "Top KOC Video vs LIVE")
        else:
            st.info("Không có dữ liệu VIDEO_LIVE_COMPARISON.")

    elif page == "KOC Segmentation":
        display_section_header(
            "KOC Segmentation",
            "Phân khúc creator theo GMV, đơn hàng và hiệu suất video/live.",
        )
        if not kok_segmentation_df.empty:
            seg_fig = build_segment_donut_chart(kok_segmentation_df, "KOC Segmentation by GMV")
            if seg_fig is not None:
                st.plotly_chart(seg_fig, use_container_width=True)
            render_table_preview(kok_segmentation_df.sort_values("Total_GMV", ascending=False).head(50), "KOC Segmentation Details")
        else:
            st.info("Không có dữ liệu KOC_SEGMENTATION.")

    elif page == "Shop Analytics":
        display_section_header(
            "Shop Analytics",
            "Đánh giá hiệu suất shop và độ đa dạng KOC sản phẩm.",
        )
        if not top10_shop_df.empty:
            st.plotly_chart(build_bar_chart(top10_shop_df, top10_shop_df.columns[0], "Doanh_thu", "Top 10 Shop"), use_container_width=True)
            render_table_preview(top10_shop_df, "Top 10 Shop")
        else:
            st.info("Không có dữ liệu TOP10_SHOP.")

    elif page == "Product Analytics":
        display_section_header(
            "Product Analytics",
            "Phân tích sản phẩm theo doanh thu, đơn hàng và số KOC/shop tham gia.",
        )
        if not top10_product_df.empty:
            st.plotly_chart(build_bar_chart(top10_product_df, top10_product_df.columns[0], "Doanh_thu", "Top 10 Product"), use_container_width=True)
            render_table_preview(top10_product_df, "Top 10 Product")
        else:
            st.info("Không có dữ liệu TOP10_PRODUCT.")

    elif page == "AI Insights":
        display_section_header(
            "AI Insights",
            "Trực quan hoá nhận xét kinh doanh từ dữ liệu và AI-generated insights.",
        )
        render_insights(insights_df)

    elif page == "AI Automation Opportunities":
        display_section_header(
            "AI Automation Opportunities",
            "Các cơ hội tự động hoá dữ liệu và báo cáo trong quy trình thương mại điện tử.",
        )
        render_automation_table()

    elif page == "Workflow Redesign":
        display_section_header(
            "Workflow Redesign",
            "Đề xuất quy trình AI-first để biến đổi vận hành KOC commerce.",
        )
        render_workflow_redesign()

    if page != "Workflow Redesign":
        st.markdown("---")
        st.caption(f"Report loaded from: {path}")


if __name__ == "__main__":
    main()
