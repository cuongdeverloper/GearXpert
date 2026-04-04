export const mapRentalCard = (rental) => {
  const firstItem = rental.rentalItems?.[0];
  const deviceName = firstItem?.deviceId?.name || "Thiết bị";
  const extraCount = (rental.rentalItems?.length || 0) - 1;

  return {
    id: rental._id,
    code: String(rental._id).slice(-6).toUpperCase(),
    customerName:
      rental.customerId?.fullName || rental.deliveryAddress?.receiverName || "Khách hàng",
    phone: rental.phoneNumber || "-",
    address: rental.deliveryAddress?.fullAddress || "-",
    deviceLabel:
      extraCount > 0 ? `${deviceName} (+${extraCount} thiết bị)` : deviceName,
    raw: rental,
  };
};

export const makeInspectionPayload = (handover, inspectionForm) => {
  const fallbackItems = handover?.prefetchedSnapshot?.items || [];
  const currentItems =
    Array.isArray(inspectionForm.items) && inspectionForm.items.length > 0
      ? inspectionForm.items
      : fallbackItems;

  const items = currentItems.map((item) => ({
    rentalItemId: item.rentalItemId,
    deviceId: item.deviceId,
    deliveredDeviceItemIds: Array.isArray(item.deliveredDeviceItemIds)
      ? item.deliveredDeviceItemIds.filter(Boolean)
      : [],
    deliveredSerialNumbers: Array.isArray(item.deliveredSerialNumbers)
      ? item.deliveredSerialNumbers.filter(Boolean)
      : [],
    accessories: Array.isArray(item.accessories) ? item.accessories : [],
    deviceCondition: item.deviceCondition || "UNKNOWN",
    mismatchNote: item.mismatchNote || "",
    operatorNote: item.operatorNote || "",
    evidenceUrls: Array.isArray(item.evidenceUrls) ? item.evidenceUrls : [],
  }));

  return {
    checklist: {
      customerPresent: Boolean(inspectionForm.customerPresent),
      customerIdentityVerified: Boolean(inspectionForm.customerIdentityVerified),
      deliveryAddressMatched: Boolean(inspectionForm.deliveryAddressMatched),
    },
    items,
    operatorNote: inspectionForm.operatorNote || "",
    evidenceUrls: inspectionForm.evidenceUrls
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean),
  };
};
