// src/pages/staff/OperationStaffDashboard.jsx
import { useOutletContext } from "react-router-dom";

import DeliveryTab from "./tabs/DeliveryTab";
import ReturnTab from "./tabs/ReturnTab";
import ContractsTab from "./tabs/ContractsTab";
import IssuesTab from "./tabs/IssuesTab";
import DamageTab from "./tabs/DamageTab";
import MaintenanceTab from "./tabs/MaintenanceTab";
import OverviewTab from "./tabs/OverviewTab";

export default function OperationStaffDashboard() {
  const { activeTab } = useOutletContext(); // Nhận từ StaffLayout

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <OverviewTab />;
      case "delivery":
        return <DeliveryTab />;
      case "return":
        return <ReturnTab />;
      case "contracts":
        return <ContractsTab />;
      case "issues":
        return <IssuesTab />;
      case "damage":
        return <DamageTab />;
      case "maintenance":
        return <MaintenanceTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div>

      {renderTab()}
    </div>
  );
}