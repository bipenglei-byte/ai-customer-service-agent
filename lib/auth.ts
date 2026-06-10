import { NextRequest } from "next/server";

export function isAdminRequest(request: NextRequest) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = request.headers.get("x-admin-password");

  if (!configuredPassword) {
    return true;
  }

  return providedPassword === configuredPassword;
}

export function unauthorizedResponse() {
  return Response.json(
    { error: "Admin password is invalid." },
    { status: 401 }
  );
}
