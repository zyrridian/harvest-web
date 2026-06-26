import { NextResponse } from "next/server";
import { successResponse } from "@/core/helpers/response";

export async function GET() {
  const units = [
    { value: "kg", label: "Kilogram (kg)" },
    { value: "gram", label: "Gram (g)" },
    { value: "pcs", label: "Pieces (pcs)" },
    { value: "pack", label: "Pack" },
    { value: "bunch", label: "Bunch" },
    { value: "box", label: "Box" },
    { value: "liter", label: "Liter (L)" },
    { value: "dozen", label: "Dozen" },
  ];

  return successResponse(units);
}
