/**
 * 순회점검 사진대지 — 원본 SSI-602-06 양식4-2(1X2) / 양식4-3(2X2) 재현.
 * A4 세로. layout으로 한 장에 2건(세로 2칸)인지 4건(2×2)인지 정한다.
 *
 * 사진이 붙은 발굴 항목만 모아 찍는다 — 빈 칸을 억지로 채우지 않는다.
 */
import { usePhotoUrl } from "@/components/photo";
import type { Inspection, InspectionItem } from "@/lib/types";

export type PhotoLayout = "1x2" | "2x2";
const PER_PAGE: Record<PhotoLayout, number> = { "1x2": 2, "2x2": 4 };

function Cell({ item, facility }: { item: InspectionItem; facility: string }) {
  const url = usePhotoUrl(item.photo);
  return (
    <div className="cell">
      <div className="cap">◈ 대상시설 : {facility || "-"}</div>
      <div className="photo">{url ? <img src={url} alt="" /> : <div className="empty">순회점검 사진</div>}</div>
      <div className="memo">{item.content}</div>
    </div>
  );
}

export function InspectionPhotoSheet({
  inspection: v,
  layout,
}: {
  inspection: Inspection;
  layout: PhotoLayout;
}) {
  const withPhoto = v.items.filter((it) => it.photo);
  const per = PER_PAGE[layout];
  const pages: InspectionItem[][] = [];
  for (let i = 0; i < withPhoto.length; i += per) pages.push(withPhoto.slice(i, i + per));
  if (pages.length === 0) pages.push([]);

  return (
    <div className={`print-root sheet sheet-inspection-photo layout-${layout}`}>
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      {pages.map((chunk, p) => (
        <div className="print-page" key={p}>
          <div className="sheet-title">순회점검 사진대지</div>
          <div className="grid">
            {chunk.map((it) => (
              <Cell key={it.id} item={it} facility={v.facility} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
