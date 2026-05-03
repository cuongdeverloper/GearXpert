import "./Message.scss";
import ImageUser from "../../../public/avatar.jpg";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  customerConfirmCompensationProposal,
  supplierConfirmCompensationProposal,
} from "../../../../service/ApiService/ReportApi";
import { CustomerCompensationDecisionChatCard } from "../../../compensation/CompensationChatCustomerDecision";

const Message = ({ message, own, showTime, receiver, handleDelete }) => {
  const [confirmingProposal, setConfirmingProposal] = useState(false);
  const [localDecision, setLocalDecision] = useState(message?.payload?.customerDecision || "PENDING");
  const [localSupplierDecision, setLocalSupplierDecision] = useState(
    message?.payload?.supplierDecision || "PENDING"
  );
  const [localAdminDecision, setLocalAdminDecision] = useState(
    message?.payload?.adminDecision || "PENDING"
  );
  const [localFlowStatus, setLocalFlowStatus] = useState(message?.payload?.flowStatus || "PROPOSED");

  useEffect(() => {
    setLocalDecision(message?.payload?.customerDecision || "PENDING");
    setLocalSupplierDecision(message?.payload?.supplierDecision || "PENDING");
    setLocalAdminDecision(message?.payload?.adminDecision || "PENDING");
    setLocalFlowStatus(message?.payload?.flowStatus || "PROPOSED");
  }, [
    message?.payload?.customerDecision,
    message?.payload?.supplierDecision,
    message?.payload?.adminDecision,
    message?.payload?.flowStatus,
  ]);

  const messageDate = new Date(message.createdAt);
  
  // Create a display string that changes based on whether the message is from today or older
  const getDisplayTime = (date) => {
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

    if (isToday) {
      // If today, show only time (e.g., 10:30 AM)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      // If older than today, show full date and time (e.g., 01/02/2026 10:30 AM)
      return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    }
  };

  const displayTime = getDisplayTime(messageDate);
  
  const exactTime = messageDate.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (message.type === "call") {
    return (
      <>
        {showTime && <div className="messageSeparatorTime">{displayTime}</div>}
        
        <div className={own ? "message own" : "message"}>
            {!own && (
                <img
                    className="messageImg"
                    src={receiver?.avatar} 
                    alt="avatar"
                />
            )}
            
            <div className="messageWrapper">
                <div className="callBubble" style={{
                    padding: "12px 16px",
                    borderRadius: "20px",
                    background: own ? "#f3f4f6" : "white", 
                    border: "1px solid #e5e7eb",
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>
                    <div style={{
                        width: "36px", height: "36px", 
                        borderRadius: "50%", 
                        background: "#e5e7eb", 
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                        <i className="fas fa-video" style={{color: "#333", fontSize: "14px"}}></i>
                    </div>
                    
                    <div style={{display: "flex", flexDirection: "column"}}>
                        <span style={{fontWeight: "600", fontSize: "14px"}}>Cuộc gọi video</span>
                        <span style={{fontSize: "11px", color: "#6b7280"}}>{exactTime}</span>
                    </div>
                </div>
            </div>
        </div>
      </>
    )
  }

  if (message.type === "compensation_proposal") {
    const payload = message.payload || {};
    if (payload.cardVariant === "CUSTOMER_DECISION") {
      return (
        <>
          {showTime && <div className="messageSeparatorTime">{displayTime}</div>}
          <div className={own ? "message own" : "message"}>
            {!own && (
              <img
                className="messageImg"
                src={receiver?.avatar || ImageUser}
                alt="User avatar"
              />
            )}
            <div className="messageWrapper group relative">
              <div style={{ width: "min(420px, 100%)" }} title={exactTime}>
                <CustomerCompensationDecisionChatCard payload={payload} isOwn={own} maxWidth={420} />
              </div>
            </div>
          </div>
        </>
      );
    }
    const amount = Number(payload.amount || 0);
    const resolutionLabelMap = {
      CUSTOMER_PAY: "Đề xuất khách đền bù",
      SUPPLIER_BEAR: "Supplier tự chịu",
      REQUEST_GX_REVIEW: "Điều phối từ cọc (GX)",
      PLATFORM_LIABILITY: "Hệ thống đền bù thiệt hại",
    };
    const actionLink = payload.link || payload.customerLink || payload.supplierLink;
    const issueIdFromLink = String(payload.supplierLink || "").match(/\/supplier\/issues\/([^/?#]+)/)?.[1] || null;
    const issueId = payload.issueId || issueIdFromLink;
    const canCustomerConfirm = !own && !!issueId && localDecision !== "ACCEPTED";
    const canSupplierConfirm =
      own &&
      !!issueId &&
      localDecision === "ACCEPTED" &&
      localSupplierDecision !== "ACCEPTED" &&
      localFlowStatus !== "PENDING_ADMIN_REVIEW" &&
      localFlowStatus !== "ADMIN_APPROVED";
    const statusMeta =
      localAdminDecision === "APPROVED" || localFlowStatus === "ADMIN_APPROVED"
        ? { text: "Admin da duyet de xuat", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" }
        : localAdminDecision === "REJECTED" || localFlowStatus === "ADMIN_REJECTED"
        ? { text: "Admin da tu choi de xuat", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" }
        : localFlowStatus === "PENDING_ADMIN_REVIEW"
        ? { text: "Dang cho admin duyet", color: "#92400e", bg: "#fffbeb", border: "#fde68a" }
        : localDecision === "REJECTED"
        ? { text: "Khach hang da tu choi", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" }
        : localDecision === "ACCEPTED"
        ? { text: "Khach da xac nhan, cho supplier chuyen admin", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" }
        : { text: "Dang cho khach hang xac nhan", color: "#92400e", bg: "#fffbeb", border: "#fde68a" };

    const handleCustomerConfirm = async () => {
      if (!issueId || confirmingProposal || localDecision === "ACCEPTED") return;
      try {
        setConfirmingProposal(true);
        const res = await customerConfirmCompensationProposal(issueId, { decision: "ACCEPTED" });
        const proposal = res?.data?.proposal || res?.proposal || {};
        const nextDecision = proposal?.customerDecision || "ACCEPTED";
        setLocalDecision(nextDecision);
        setLocalSupplierDecision(proposal?.supplierDecision || "PENDING");
        setLocalAdminDecision(proposal?.adminDecision || "PENDING");
        setLocalFlowStatus(proposal?.flowStatus || "CUSTOMER_ACCEPTED");
        toast.success("Da xac nhan de xuat boi thuong");
      } catch (error) {
        toast.error(error?.response?.data?.message || "Khong the xac nhan de xuat");
      } finally {
        setConfirmingProposal(false);
      }
    };

    const handleSupplierConfirm = async () => {
      if (!issueId || confirmingProposal || !canSupplierConfirm) return;
      try {
        setConfirmingProposal(true);
        const res = await supplierConfirmCompensationProposal(issueId, { decision: "ACCEPTED" });
        const proposal = res?.data?.proposal || res?.proposal || {};
        setLocalDecision(proposal?.customerDecision || localDecision);
        setLocalSupplierDecision(proposal?.supplierDecision || "ACCEPTED");
        setLocalAdminDecision(proposal?.adminDecision || "PENDING");
        setLocalFlowStatus(proposal?.flowStatus || "PENDING_ADMIN_REVIEW");
        toast.success("Supplier da chap nhan thiet hai va chuyen admin duyet");
      } catch (error) {
        toast.error(error?.response?.data?.message || "Khong the chuyen de xuat cho admin");
      } finally {
        setConfirmingProposal(false);
      }
    };

    return (
      <>
        {showTime && <div className="messageSeparatorTime">{displayTime}</div>}
        <div className={own ? "message own" : "message"}>
          {!own && (
            <img
              className="messageImg"
              src={receiver?.avatar || ImageUser}
              alt="User avatar"
            />
          )}
          <div className="messageWrapper group relative">
            <div
              style={{
                width: "min(420px, 100%)",
                borderRadius: "16px",
                border: own ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                background: own ? "linear-gradient(180deg,#eff6ff,#dbeafe)" : "#ffffff",
                padding: "12px",
                boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
              }}
              title={exactTime}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 6 }}>
                DE XUAT BOI THUONG
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {payload.title || "De xuat xu ly su co thiet bi"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Muc de xuat</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    {amount.toLocaleString("vi-VN")} VND
                  </div>
                </div>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Phuong an</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                    {resolutionLabelMap[payload.suggestedResolution] || payload.suggestedResolution || "-"}
                  </div>
                </div>
              </div>
              {payload.reason && (
                <div style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>
                  <b>Ly do:</b> {payload.reason}
                </div>
              )}
              {payload.explanation && (
                <div style={{ fontSize: 12, color: "#334155", marginBottom: 8, whiteSpace: "pre-wrap" }}>
                  <b>Giai thich:</b> {payload.explanation}
                </div>
              )}
              {Array.isArray(payload.images) && payload.images.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {payload.images.slice(0, 3).map((img, idx) => (
                    <img
                      key={`proposal-img-${idx}`}
                      src={img}
                      alt={`proposal-${idx}`}
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 8,
                        objectFit: "cover",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                      }}
                      onClick={() => window.open(img, "_blank")}
                    />
                  ))}
                </div>
              )}
              {actionLink && (
                <button
                  style={{
                    border: "none",
                    borderRadius: 10,
                    background: "#2563eb",
                    color: "white",
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    window.location.href = actionLink;
                  }}
                >
                  Xem chi tiet
                </button>
              )}
              {canCustomerConfirm && (
                <button
                  style={{
                    borderRadius: 10,
                    background: "#ffffff",
                    color: "#047857",
                    border: "1px solid #059669",
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: confirmingProposal ? "default" : "pointer",
                    marginLeft: actionLink ? 8 : 0,
                    opacity: confirmingProposal ? 0.6 : 1,
                  }}
                  disabled={confirmingProposal}
                  onClick={handleCustomerConfirm}
                >
                  {confirmingProposal ? "Dang xac nhan..." : "Xac nhan de xuat"}
                </button>
              )}
              {canSupplierConfirm && (
                <button
                  style={{
                    borderRadius: 10,
                    background: "#fffbeb",
                    color: "#92400e",
                    border: "1px solid #f59e0b",
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: confirmingProposal ? "default" : "pointer",
                    marginLeft: actionLink || canCustomerConfirm ? 8 : 0,
                    opacity: confirmingProposal ? 0.6 : 1,
                  }}
                  disabled={confirmingProposal}
                  onClick={handleSupplierConfirm}
                >
                  {confirmingProposal ? "Dang chuyen..." : "Supplier chap nhan thiet hai"}
                </button>
              )}
              {!canCustomerConfirm && (
                <div
                  style={{
                    fontSize: 11,
                    color: statusMeta.color,
                    fontWeight: 700,
                    marginTop: 8,
                    background: statusMeta.bg,
                    border: `1px solid ${statusMeta.border}`,
                    borderRadius: 8,
                    padding: "6px 8px",
                    display: "inline-block",
                  }}
                >
                  {statusMeta.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showTime && (
        <div className="messageSeparatorTime">
          {displayTime}
        </div>
      )}

      <div className={own ? "message own" : "message"}>
        
        {!own && (
          <img
            className="messageImg"
            src={receiver?.avatar || ImageUser} 
            alt="User avatar" 
          />
        )}

        <div className="messageWrapper group relative">
          {message.image && (
            <img 
              className="messageContentImg" 
              src={message.image} 
              alt="Message attachment"
              title={exactTime}
            />
          )}

          {message.text && (
            <p className="messageText" title={exactTime}>
              {message.text}
            </p>
          )}

          <div 
             className="messageActions opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 -translate-y-1/2 cursor-pointer"
             style={{ [own ? 'left' : 'right']: '-30px' }} 
           >
               <i 
                 className="fas fa-trash-alt text-red-500 hover:scale-110 transition-transform p-2" 
                 onClick={() => handleDelete(message._id)}
                 title="Xóa ở phía tôi"
               ></i>
           </div>
        </div>
      </div>
    </>
  );
};

export default Message;