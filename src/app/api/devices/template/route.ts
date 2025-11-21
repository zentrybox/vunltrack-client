import { NextResponse } from "next/server";

// Returns a downloadable JSON template for bulk device upload
export async function GET() {
  const template = {
    devices: [
      {
        vendor: "Cisco",
        product: "Nexus 9000",
        version: "9.3(5)",
        name: "Core switch",
        ip: "10.10.21.14",
        serial: "SN123456789",
        state: "active",
      },
      {
        vendor: "Fortinet",
        product: "FortiGate 100F",
        version: "v7.2.5",
        name: "Edge firewall",
        ip: "10.10.1.1",
        serial: "FGT90E3G16000000",
        state: "active",
      },
    ],
    notes:
      "Todos los campos son requeridos: vendor, product, version, name, ip, serial, state (active|inactive|retired).",
  };

  const json = JSON.stringify(template, null, 2);
  const response = new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="devices-template.json"',
      "Cache-Control": "no-store",
    },
  });

  return response;
}
