import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useApprovalLimitHint, useCan, usePermissions } from "@/components/common/PermissionGate";
import { RequireAccess } from "@/components/common/RequireAccess";
import type { PermissionKey } from "@/lib/permissions";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

function Probe({ k }: { k: PermissionKey }) {
  const allowed = useCan(k);
  const { canSee, scope } = usePermissions();
  return (
    <p>
      {k}:{allowed ? "yes" : "no"} rates:{canSee("rates") ? "yes" : "no"} scope:{scope(k) ?? "none"}
    </p>
  );
}

function LimitProbe({ amount }: { amount: string }) {
  const hint = useApprovalLimitHint();
  return <p>{hint("cashbook.expense.approve", amount) ?? "ok"}</p>;
}

describe("useCan / usePermissions", () => {
  it("reads keys from /auth/me; THEKEDAR has everything", () => {
    renderWithStore(<Probe k="subscription.manage" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("subscription.manage:yes rates:yes scope:ALL_PROJECTS")).toBeInTheDocument();
  });

  it("a MUNSHI without the key gets no, and no rates", () => {
    renderWithStore(<Probe k="labor.settlement.approve" />, { me: meFixture("MUNSHI") });
    expect(screen.getByText("labor.settlement.approve:no rates:no scope:none")).toBeInTheDocument();
  });

  it("a PM holds scoped keys on assigned projects", () => {
    renderWithStore(<Probe k="labor.attendance.view" />, { me: meFixture("PM") });
    expect(
      screen.getByText("labor.attendance.view:yes rates:yes scope:ASSIGNED_PROJECTS"),
    ).toBeInTheDocument();
  });

  it("explains an amount above the approval limit (translated)", () => {
    const me = meFixture("PM", { approvalLimits: { "cashbook.expense.approve": "5000000" } });
    const { unmount } = renderWithStore(<LimitProbe amount="6000000" />, { me });
    expect(screen.getByText(/above your approval limit/i)).toBeInTheDocument();
    unmount();
    renderWithStore(<LimitProbe amount="6000000" />, { me, ui: { language: "roman-ur" } });
    expect(screen.getByText(/manzoori ki had se zyada/i)).toBeInTheDocument();
  });

  it("RequireAccess shows the translated no-permission page", () => {
    renderWithStore(
      <RequireAccess permission="team.member.manage">
        <p>Roles</p>
      </RequireAccess>,
      { me: meFixture("PM"), ui: { language: "ur" } },
    );
    expect(screen.queryByText("Roles")).not.toBeInTheDocument();
    expect(screen.getByText("آپ کے لیے دستیاب نہیں")).toBeInTheDocument();
  });
});
