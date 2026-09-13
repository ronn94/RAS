/**
 * 승인자 드롭다운 — 설정(직원 명단 → 승인자)에서 지정한 사람만 고른다.
 *
 * 이미 저장된 이름이 목록에 없을 수 있다(지정에서 빠졌거나, 승인자 개념이 생기기 전에
 * 자유 입력으로 적힌 옛 문서). 그런 이름은 **목록에 덧붙여** 보여 준다 — 안 그러면
 * 문서를 열어 다른 값을 고치기만 해도 결재자가 조용히 지워진다.
 */
import { Select } from "@/components/ui";
import { approverNames } from "@/lib/settings";
import { useStore } from "@/store";

export function ApproverSelect({
  value,
  onChange,
  disabled,
  className = "w-full",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { settings } = useStore();
  const options = approverNames(settings);
  const list = value && !options.includes(value) ? [...options, value] : options;

  return (
    <Select className={className} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">승인자에서 고르세요</option>
      {list.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  );
}
