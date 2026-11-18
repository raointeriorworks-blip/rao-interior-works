import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const ADMIN_EMAIL = "raointeriorworks@gmail.com";
const STORE = getStore("rao-site-content", { region: "ap-southeast-1" });
const DEFAULT_CONTENT = {
  "text": {
    "aboutTitle": "Good work is in the details.",
    "aboutDescription": "At RAO, we believe furniture should do more than fill a room. It should fit your life. We bring practical experience, careful workmanship and a personal approach to every carpentry project.",
    "servicesTitle": "Our Carpentry Services",
    "servicesDescription": "Practical, well-finished woodwork for homes and spaces. Tell us what you have in mind and we can discuss a suitable solution.",
    "service1Title": "Custom Furniture",
    "service1Description": "Furniture planned and made to suit your room, measurements and everyday needs.",
    "service2Title": "Wardrobes & Storage",
    "service2Description": "Thoughtful storage, wardrobes and cabinets designed to make better use of space.",
    "service3Title": "Doors & Frames",
    "service3Description": "Carpentry, installation and finishing for doors, frames and related woodwork.",
    "service4Title": "Kitchen Woodwork",
    "service4Description": "Cabinetry and practical kitchen storage with a clean, coordinated finish.",
    "service5Title": "Repairs & Fittings",
    "service5Description": "Furniture repairs, adjustments, hardware fitting and other carpentry work.",
    "service6Title": "Interior Woodwork",
    "service6Description": "Wooden partitions, shelves, panels and custom details for your interiors.",
    "projectsTitle": "Craft & Finish",
    "projectsDescription": "A visual direction for the kind of work featured in the RAO project gallery. Replace these sample images with your completed projects.",
    "contactTitle": "Have a project in mind?",
    "contactDescription": "Get in touch with RAO to discuss your carpentry or furniture requirements. Share your idea, measurements or reference photos and we can take it from there.",
    "contactEmail": "raointeriorworks@gmail.com",
    "emailHref": "mailto:raointeriorworks@gmail.com?subject=RAO%20Carpentry%20Enquiry",
    "whatsappHref": "https://wa.me/919372979820?text=Hello%20RAO%2C%20I%20would%20like%20to%20enquire%20about%20your%20carpentry%20and%20furniture%20services."
  },
  "gallery": [
    {
      "label": "Living Spaces",
      "image": ""
    },
    {
      "label": "Custom Furniture",
      "image": ""
    },
    {
      "label": "Modern Interiors",
      "image": ""
    },
    {
      "label": "Wood Finishes",
      "image": ""
    },
    {
      "label": "Made for Home",
      "image": ""
    }
  ]
};

async function requireAdmin() {
  const user = await getUser();
  if (!user) return { ok: false, status: 401, message: "Please log in." };
  if ((user.email || "").trim().toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, status: 403, message: "This account is not allowed to edit this website." };
  }
  return { ok: true, user };
}

export default async (req) => {
  if (req.method === "GET") {
    const saved = await STORE.get("site-content", { type: "json" });
    return Response.json(saved || DEFAULT_CONTENT, { headers: { "Cache-Control": "no-store" } });
  }
  if (req.method !== "PUT") return new Response("Method not allowed", { status: 405 });
  const auth = await requireAdmin();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object" || !body.text || !Array.isArray(body.gallery)) {
    return Response.json({ error: "Invalid website content." }, { status: 400 });
  }
  const text = {};
  for (const [key, value] of Object.entries(body.text)) {
    if (!(key in DEFAULT_CONTENT.text) || typeof value !== "string" || value.length > 3000) continue;
    text[key] = value;
  }
  const gallery = body.gallery.slice(0, 5).map((item, i) => ({
    label: typeof item?.label === "string" ? item.label.slice(0, 100) : DEFAULT_CONTENT.gallery[i].label,
    image: typeof item?.image === "string" ? item.image.slice(0, 500) : ""
  }));
  while (gallery.length < 5) gallery.push(DEFAULT_CONTENT.gallery[gallery.length]);
  await STORE.setJSON("site-content", { text: { ...DEFAULT_CONTENT.text, ...text }, gallery });
  return Response.json({ ok: true });
};
