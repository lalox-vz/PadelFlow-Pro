
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as XLSX from "xlsx";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the admin's organization_id
        const { data: adminUserData, error: adminError } = await supabase
            .from("users")
            .select("organization_id")
            .eq("id", user.id)
            .single();

        if (adminError || !adminUserData?.organization_id) {
            return NextResponse.json({ error: "Organization not found for user" }, { status: 400 });
        }

        const organizationId = adminUserData.organization_id;

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        // Expected columns: first_name, last_name, email, initial_credits
        const results = [];
        const errors = [];

        for (const row of rows) {
            const email = row.email;
            const firstName = row.first_name || "";
            const lastName = row.last_name || "";
            const fullName = `${firstName} ${lastName}`.trim();
            const credits = row.initial_credits || 0;

            if (!email) {
                errors.push({ row, error: "Missing email" });
                continue;
            }

            // 1. Create Auth User
            // We use inviteUserByEmail so they get an email to set password, OR createUser if we want to confirm them immediately.
            // Let's use createUser with auto-confirm for migration purposes, or invite if preferred.
            // Setup typically prefers invites, but bulk import often implies "migration" where we might want to just set them up.
            // I'll use createUser with a dummy password or email_confirm: true (if using Supabase Auth SMTP).
            // Ideally, inviteUserByEmail is better for real users.
            // Prompt says "Bulk create students".

            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                email_confirm: true,
                user_metadata: {
                    full_name: fullName,
                    organization_id: organizationId, // Important for the trigger
                }
            });

            if (authError) {
                // If user already exists, we might still want to add them to this org (if logic allowed multiple orgs, but our logic is 1 org per user for now).
                // If 1 org per user, and they exist, we fail or skip.
                errors.push({ email, error: authError.message });
                continue;
            }

            if (authUser.user) {
                // 2. Add Credits (Membership)
                // The trigger created the user record in public.users.
                // We now add the membership record.

                const { error: memberError } = await supabaseAdmin
                    .from("memberships")
                    .insert({
                        student_id: authUser.user.id,
                        organization_id: organizationId,
                        class_credits: credits
                    });

                if (memberError) {
                    errors.push({ email, error: "User created but failed to add credits: " + memberError.message });
                } else {
                    results.push({ email, status: "Created" });
                }
            }
        }

        return NextResponse.json({ success: true, results, errors });

    } catch (error: any) {
        console.error("Import error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
