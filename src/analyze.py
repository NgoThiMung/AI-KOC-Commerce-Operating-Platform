import argparse
import logging
import os
import re
from typing import Dict

import numpy as np
import pandas as pd


# =========================
# LOGGING
# =========================

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )


# =========================
# CLEAN FUNCTIONS
# =========================

def normalize_col_name(col: str) -> str:
    return re.sub(r"\s+", "_", str(col).strip().lower())


def clean_currency_series(series: pd.Series) -> pd.Series:
    """
    Clean tiền Việt Nam:
    1.040.972.302₫ -> 1040972302
    """
    cleaned = (
        series.fillna("0")
        .astype(str)
        .str.replace("₫", "", regex=False)
        .str.replace("VND", "", regex=False)
        .str.replace("vnd", "", regex=False)
        .str.replace(".", "", regex=False)
        .str.replace(",", "", regex=False)
        .str.strip()
        .replace("", "0")
        .replace("nan", "0")
    )

    return pd.to_numeric(cleaned, errors="coerce").fillna(0)


# =========================
# LOAD DATA
# =========================

def load_data(file_path: str, sheet_name: str) -> pd.DataFrame:
    logging.info("Đang đọc file Excel...")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Không tìm thấy file: {file_path}")

    df = pd.read_excel(file_path, sheet_name=sheet_name, dtype=str)

    logging.info(f"Đã đọc dữ liệu: {df.shape[0]} dòng, {df.shape[1]} cột")

    return df


# =========================
# CLEAN DATA
# =========================

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    logging.info("Đang làm sạch dữ liệu...")

    df = df.copy()

    # Clean tên cột gốc
    df.columns = df.columns.str.strip()

    # Xóa dòng tổng/tóm tắt
    if "Ngày" in df.columns:
        df = df[df["Ngày"].astype(str).str.lower() != "tóm tắt"].copy()

    # Clean text columns
    text_cols = [
        "Tên nhà sáng tạo",
        "Tên cửa hàng",
        "Tên sản phẩm",
        "ID sản phẩm",
        "ID cửa hàng",
    ]

    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].fillna("Không xác định").astype(str).str.strip()

    # Tạo bản sao cột xử lý
    currency_cols = {
        "GMV liên kết": "GMV_clean",
        "GMV video của liên kết": "GMV_VIDEO_clean",
        "GMV LIVE của liên kết": "GMV_LIVE_clean",
        "Đơn hàng": "ORDER_clean",
        "Lượt xem video": "VIDEO_VIEW_clean",
        "Lượt xem LIVE": "LIVE_VIEW_clean",
        "Số món bán ra": "ITEM_SOLD_clean",
        "Hoa hồng ước tính của đối tác liên kết": "PARTNER_COMMISSION_EST_clean",
        "Hoa hồng thực tế của đối tác liên kết": "PARTNER_COMMISSION_ACTUAL_clean",
        "Hoa hồng ước tính của nhà sáng tạo": "CREATOR_COMMISSION_EST_clean",
        "Hoa hồng thực tế của nhà sáng tạo": "CREATOR_COMMISSION_ACTUAL_clean",
    }

    for raw_col, clean_col in currency_cols.items():
        if raw_col in df.columns:
            df[clean_col] = clean_currency_series(df[raw_col])

    logging.info(f"Sau clean: {df.shape[0]} dòng, {df.shape[1]} cột")

    return df


# =========================
# HELPERS
# =========================

def safe_sum(df: pd.DataFrame, col: str) -> float:
    return float(df[col].sum()) if col in df.columns else 0.0


def safe_nunique(df: pd.DataFrame, col: str) -> int:
    return int(df[col].nunique(dropna=True)) if col in df.columns else 0


def build_top10_koc(df: pd.DataFrame, metric_col: str, top_n: int = 10) -> pd.DataFrame:
    result = (
        df.groupby("Tên nhà sáng tạo", as_index=False)
        .agg(
            Doanh_thu=(metric_col, "sum"),
            So_don=("ORDER_clean", "sum"),
            So_san_pham=("Tên sản phẩm", "nunique"),
            So_shop=("Tên cửa hàng", "nunique"),
        )
    )
    result["Avg_GMV_per_product"] = result["Doanh_thu"] / result["So_san_pham"].replace({0: np.nan})
    result["Avg_GMV_per_shop"] = result["Doanh_thu"] / result["So_shop"].replace({0: np.nan})
    return result.sort_values("Doanh_thu", ascending=False).head(top_n)


def build_top10_shop(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    result = (
        df.groupby("Tên cửa hàng", as_index=False)
        .agg(
            Doanh_thu=("GMV_clean", "sum"),
            So_don=("ORDER_clean", "sum"),
            So_KOC=("Tên nhà sáng tạo", "nunique"),
            So_san_pham=("Tên sản phẩm", "nunique"),
        )
    )
    result["Avg_GMV_per_product"] = result["Doanh_thu"] / result["So_san_pham"].replace({0: np.nan})
    result["Avg_GMV_per_KOC"] = result["Doanh_thu"] / result["So_KOC"].replace({0: np.nan})
    return result.sort_values("Doanh_thu", ascending=False).head(top_n)


def build_top10_product(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    result = (
        df.groupby("Tên sản phẩm", as_index=False)
        .agg(
            Doanh_thu=("GMV_clean", "sum"),
            So_don=("ORDER_clean", "sum"),
            So_KOC=("Tên nhà sáng tạo", "nunique"),
            So_shop=("Tên cửa hàng", "nunique"),
        )
    )
    result["Avg_GMV_per_KOC"] = result["Doanh_thu"] / result["So_KOC"].replace({0: np.nan})
    return result.sort_values("Doanh_thu", ascending=False).head(top_n)


def build_top_tables(df: pd.DataFrame, top_n: int = 10) -> Dict[str, pd.DataFrame]:
    logging.info("Đang tạo các bảng Top 10...")

    return {
        "TOP10_KOC_GMV": build_top10_koc(df, "GMV_clean", top_n),
        "TOP10_KOC_VIDEO": build_top10_koc(df, "GMV_VIDEO_clean", top_n),
        "TOP10_KOC_LIVE": build_top10_koc(df, "GMV_LIVE_clean", top_n),
        "TOP10_SHOP": build_top10_shop(df, top_n),
        "TOP10_PRODUCT": build_top10_product(df, top_n),
    }


# =========================
# SEGMENTATION
# =========================

def build_koc_segmentation(df: pd.DataFrame) -> pd.DataFrame:
    koc_summary = (
        df.groupby("Tên nhà sáng tạo", as_index=False)
        .agg(
            Total_GMV=("GMV_clean", "sum"),
            Total_Orders=("ORDER_clean", "sum"),
            Num_Products=("Tên sản phẩm", "nunique"),
            Num_Shops=("Tên cửa hàng", "nunique"),
            Video_GMV=("GMV_VIDEO_clean", "sum"),
            Live_GMV=("GMV_LIVE_clean", "sum"),
        )
    )
    positive = koc_summary[koc_summary["Total_GMV"] > 0]
    if not positive.empty:
        high_threshold = positive["Total_GMV"].quantile(0.80)
        mid_threshold = positive["Total_GMV"].quantile(0.50)
    else:
        high_threshold = 0
        mid_threshold = 0

    def segment(value: float) -> str:
        if value == 0:
            return "No-sales KOC"
        if value >= high_threshold:
            return "High-performing KOC"
        if value >= mid_threshold:
            return "Medium-performing KOC"
        return "Low-performing KOC"

    koc_summary["Segment"] = koc_summary["Total_GMV"].apply(segment)
    koc_summary["Video_share"] = np.where(
        koc_summary["Total_GMV"] > 0,
        koc_summary["Video_GMV"] / koc_summary["Total_GMV"],
        0,
    )
    koc_summary["Live_share"] = np.where(
        koc_summary["Total_GMV"] > 0,
        koc_summary["Live_GMV"] / koc_summary["Total_GMV"],
        0,
    )

    return koc_summary.sort_values(["Segment", "Total_GMV"], ascending=[True, False])


# =========================
# VIDEO VS LIVE COMPARISON
# =========================

def build_video_live_comparison(df: pd.DataFrame) -> pd.DataFrame:
    video_live = (
        df.groupby("Tên nhà sáng tạo", as_index=False)
        .agg(
            Video_GMV=("GMV_VIDEO_clean", "sum"),
            Live_GMV=("GMV_LIVE_clean", "sum"),
            Total_GMV=("GMV_clean", "sum"),
            Total_Orders=("ORDER_clean", "sum"),
        )
    )
    video_live["Video_share"] = np.where(
        video_live["Total_GMV"] > 0,
        video_live["Video_GMV"] / video_live["Total_GMV"],
        0,
    )
    video_live["Live_share"] = np.where(
        video_live["Total_GMV"] > 0,
        video_live["Live_GMV"] / video_live["Total_GMV"],
        0,
    )
    video_live["Video_to_Live_Ratio"] = np.where(
        video_live["Live_GMV"] > 0,
        video_live["Video_GMV"] / video_live["Live_GMV"],
        np.nan,
    )

    return video_live.sort_values("Total_GMV", ascending=False)


# =========================
# DASHBOARD DATA
# =========================

def build_dashboard_data(df: pd.DataFrame, segmentation: pd.DataFrame) -> pd.DataFrame:
    logging.info("Đang tạo dữ liệu dashboard...")

    total_gmv = safe_sum(df, "GMV_clean")
    total_video_gmv = safe_sum(df, "GMV_VIDEO_clean")
    total_live_gmv = safe_sum(df, "GMV_LIVE_clean")
    total_orders = safe_sum(df, "ORDER_clean")
    total_koc = safe_nunique(df, "Tên nhà sáng tạo")
    total_shop = safe_nunique(df, "Tên cửa hàng")
    total_product = safe_nunique(df, "Tên sản phẩm")
    avg_gmv_per_koc = total_gmv / total_koc if total_koc else 0
    avg_gmv_per_shop = total_gmv / total_shop if total_shop else 0
    avg_gmv_per_product = total_gmv / total_product if total_product else 0
    avg_order_value = total_gmv / total_orders if total_orders else 0

    koc_gmv = df.groupby("Tên nhà sáng tạo", as_index=False)["GMV_clean"].sum().sort_values("GMV_clean", ascending=False)
    top1_share = koc_gmv["GMV_clean"].iloc[0] / total_gmv if total_gmv and not koc_gmv.empty else 0
    top3_share = koc_gmv["GMV_clean"].head(3).sum() / total_gmv if total_gmv else 0
    top10_share = koc_gmv["GMV_clean"].head(10).sum() / total_gmv if total_gmv else 0

    segment_counts = segmentation["Segment"].value_counts().to_dict()

    rows = [
        {"Metric": "Tổng GMV", "Value": total_gmv, "Description": "Tổng doanh thu toàn bộ dữ liệu."},
        {"Metric": "GMV Video", "Value": total_video_gmv, "Description": "Tổng GMV phát sinh từ video."},
        {"Metric": "GMV LIVE", "Value": total_live_gmv, "Description": "Tổng GMV phát sinh từ livestream."},
        {"Metric": "Tổng đơn hàng", "Value": total_orders, "Description": "Tổng số đơn hàng đã ghi nhận."},
        {"Metric": "AOV", "Value": avg_order_value, "Description": "Giá trị đơn hàng trung bình."},
        {"Metric": "Top10 KOC GMV share", "Value": top10_share, "Description": "Tỷ trọng GMV của top 10 KOC so với tổng."},
        {"Metric": "Top3 KOC GMV share", "Value": top3_share, "Description": "Tỷ trọng GMV của top 3 KOC so với tổng."},
        {"Metric": "Top1 KOC GMV share", "Value": top1_share, "Description": "Tỷ trọng GMV của KOC mạnh nhất so với tổng."},
        {"Metric": "Average GMV per KOC", "Value": avg_gmv_per_koc, "Description": "Giá trị GMV trung bình mỗi KOC."},
        {"Metric": "Average GMV per Shop", "Value": avg_gmv_per_shop, "Description": "Giá trị GMV trung bình mỗi shop."},
        {"Metric": "Average GMV per Product", "Value": avg_gmv_per_product, "Description": "Giá trị GMV trung bình mỗi sản phẩm."},
        {"Metric": "Total KOC", "Value": total_koc, "Description": "Số lượng KOC khác nhau."},
        {"Metric": "Total Shop", "Value": total_shop, "Description": "Số lượng shop khác nhau."},
        {"Metric": "Total Product", "Value": total_product, "Description": "Số lượng sản phẩm khác nhau."},
        {"Metric": "High-performing KOC", "Value": segment_counts.get("High-performing KOC", 0), "Description": "Số KOC hiệu suất cao."},
        {"Metric": "Medium-performing KOC", "Value": segment_counts.get("Medium-performing KOC", 0), "Description": "Số KOC hiệu suất trung bình."},
        {"Metric": "Low-performing KOC", "Value": segment_counts.get("Low-performing KOC", 0), "Description": "Số KOC hiệu suất thấp."},
        {"Metric": "No-sales KOC", "Value": segment_counts.get("No-sales KOC", 0), "Description": "Số KOC chưa tạo ra GMV."},
    ]

    return pd.DataFrame(rows)


# =========================
# INSIGHTS
# =========================

def build_advanced_insights(
    df: pd.DataFrame,
    top_tables: Dict[str, pd.DataFrame],
    segmentation: pd.DataFrame,
    video_live: pd.DataFrame,
) -> pd.DataFrame:
    logging.info("Đang tạo insights nâng cao...")

    total_gmv = safe_sum(df, "GMV_clean")
    total_orders = safe_sum(df, "ORDER_clean")
    avg_order_value = total_gmv / total_orders if total_orders else 0
    top_koc_share = (
        df.groupby("Tên nhà sáng tạo", as_index=False)["GMV_clean"]
        .sum()
        .sort_values("GMV_clean", ascending=False)
        .head(10)["GMV_clean"]
        .sum()
    ) / total_gmv if total_gmv else 0
    top1_share = (
        df.groupby("Tên nhà sáng tạo", as_index=False)["GMV_clean"]
        .sum()
        .sort_values("GMV_clean", ascending=False)
        ["GMV_clean"]
        .head(1)
        .sum()
    ) / total_gmv if total_gmv else 0

    insights = []
    insights.append(f"Mức độ tập trung GMV: Top 10 KOC đóng góp {top_koc_share:.2%} tổng GMV.")
    if top1_share >= 0.25:
        insights.append(
            f"Rủi ro phụ thuộc: KOC hàng đầu đang chiếm {top1_share:.2%} tổng GMV, cần đa dạng hoá portfolio KOC."
        )
    else:
        insights.append("Phân bổ GMV hiện tại chưa quá tập trung vào một KOC duy nhất.")

    if avg_order_value > 0:
        insights.append(
            f"AOV hiện tại là {avg_order_value:,.0f} VND, cần so sánh để xác định cơ hội tối ưu hoá tỷ lệ chuyển đổi."
        )
    else:
        insights.append("Chưa có dữ liệu đơn hàng đủ để phân tích AOV.")

    no_sales_count = int(segmentation[segmentation["Segment"] == "No-sales KOC"].shape[0])
    if no_sales_count > 0:
        insights.append(
            f"Có {no_sales_count} KOC chưa phát sinh doanh thu, đây là nhóm cần đánh giá lại sự phù hợp và hỗ trợ."
        )
    else:
        insights.append("Không có KOC nằm trong nhóm No-sales, điều này cho thấy dữ liệu toàn bộ KOC có doanh thu.")

    if not video_live.empty and not video_live["Video_to_Live_Ratio"].dropna().empty:
        top_gap = video_live.loc[video_live["Video_to_Live_Ratio"].idxmax()]
        insights.append(
            f"Hiệu suất video cao nhất thuộc về {top_gap['Tên nhà sáng tạo']}: ratio Video/LIVE = {top_gap['Video_to_Live_Ratio']:.2f}."
        )
        low_live = video_live[video_live["Live_GMV"] > 0].nsmallest(1, "Live_GMV")
        if not low_live.empty:
            insights.append(
                f"Một số KOC có tỷ lệ LIVE thấp so với Video, cần đánh giá lại chiến lược livestream."
            )

    if "TOP10_SHOP" in top_tables and not top_tables["TOP10_SHOP"].empty:
        top_shop = top_tables["TOP10_SHOP"].iloc[0]
        if top_shop.get("So_KOC", 0) > 10:
            insights.append(
                f"Shop hàng đầu {top_shop['Tên cửa hàng']} đang hợp tác với {top_shop['So_KOC']} KOC, cho thấy quy mô distribution rộng."
            )

    if total_orders and safe_sum(df, "VIDEO_VIEW_clean"):
        conversion_rate = total_orders / safe_sum(df, "VIDEO_VIEW_clean")
        insights.append(
            f"Tỷ lệ chuyển đổi từ views sang đơn hàng ước tính là {conversion_rate:.2%}."
        )

    if not insights:
        insights.append("Không có insight bổ sung tự động.")

    return pd.DataFrame({"Nhận xét / Insight": insights})


# =========================
# EXPORT EXCEL
# =========================

def export_excel(
    output_path: str,
    clean_df: pd.DataFrame,
    top_tables: Dict[str, pd.DataFrame],
    dashboard_df: pd.DataFrame,
    insights_df: pd.DataFrame,
    segmentation_df: pd.DataFrame,
    video_live_df: pd.DataFrame,
):
    logging.info("Đang xuất file Excel...")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        clean_df.to_excel(writer, sheet_name="CLEAN_DATA", index=False)

        for sheet_name, table in top_tables.items():
            table.to_excel(writer, sheet_name=sheet_name, index=False)

        segmentation_df.to_excel(writer, sheet_name="KOC_SEGMENTATION", index=False)
        video_live_df.to_excel(writer, sheet_name="VIDEO_LIVE_COMPARISON", index=False)
        dashboard_df.to_excel(writer, sheet_name="DASHBOARD_DATA", index=False)
        insights_df.to_excel(writer, sheet_name="INSIGHTS", index=False)

    logging.info(f"Đã xuất file: {output_path}")


# =========================
# MAIN
# =========================

def main():
    setup_logging()

    parser = argparse.ArgumentParser(description="KOC E-commerce Data Pipeline")

    parser.add_argument(
        "--input",
        default="data/CustomReport_Creator_Product_Shop 2026-04-01_2026-04-30.xlsx",
        help="Đường dẫn file Excel input"
    )

    parser.add_argument(
        "--sheet",
        default="Báo cáo tùy chỉnh",
        help="Tên sheet dữ liệu chính"
    )

    parser.add_argument(
        "--output",
        default="output/koc_report_processed.xlsx",
        help="Đường dẫn file Excel output"
    )

    parser.add_argument(
        "--topn",
        type=int,
        default=10,
        help="Số lượng top cần lấy"
    )

    args = parser.parse_args()

    df_raw = load_data(args.input, args.sheet)
    df_clean = clean_data(df_raw)

    top_tables = build_top_tables(df_clean, args.topn)
    segmentation_df = build_koc_segmentation(df_clean)
    video_live_df = build_video_live_comparison(df_clean)
    dashboard_df = build_dashboard_data(df_clean, segmentation_df)
    insights_df = build_advanced_insights(df_clean, top_tables, segmentation_df, video_live_df)

    export_excel(
        output_path=args.output,
        clean_df=df_clean,
        top_tables=top_tables,
        dashboard_df=dashboard_df,
        insights_df=insights_df,
        segmentation_df=segmentation_df,
        video_live_df=video_live_df,
    )

    print("\nHOÀN THÀNH PIPELINE")
    print(f"File output: {args.output}")


if __name__ == "__main__":
    main()