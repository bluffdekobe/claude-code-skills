import { NextRequest } from "next/server";
import { searchPlaces } from "@/lib/places";

export async function POST(req: NextRequest) {
  const { googleApiKey } = await req.json();
  try {
    const places = await searchPlaces("restaurants Zurich", googleApiKey);
    return Response.json({
      ok: true,
      total: places.length,
      withWebsite: places.filter((p) => p.websiteUri).length,
      withoutWebsite: places.filter((p) => !p.websiteUri).length,
      sample: places.slice(0, 3).map((p) => ({
        name: p.displayName.text,
        hasWebsite: !!p.websiteUri,
        phone: p.nationalPhoneNumber ?? null,
      })),
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
