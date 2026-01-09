import { mockSupplierDevices } from '../../mocks/devices.mock';

export default function SupplierDevicesList() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Devices</h1>

      <div className="grid gap-4">
        {mockSupplierDevices.map(device => (
          <div
            key={device._id}
            className="flex gap-4 rounded-lg border p-4"
          >
            {/* Image */}
            <img
              src={device.images?.[0]}
              alt={device.name}
              className="h-20 w-20 rounded object-cover"
            />

            {/* Info */}
            <div className="flex-1">
              <h2 className="font-medium">{device.name}</h2>
              <p className="text-sm text-gray-500">
                {device.category} · {device.location?.city}
              </p>

              <p className="mt-1 text-sm">
                Rent: <span className="font-medium">${device.rentPrice.perDay}/day</span>
                · Deposit: ${device.depositAmount}
              </p>
            </div>

            {/* Status */}
            <span
              className={`h-fit rounded px-2 py-1 text-xs font-medium
                ${device.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : ''}
                ${device.status === 'RENTED' ? 'bg-yellow-100 text-yellow-700' : ''}
              `}
            >
              {device.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
