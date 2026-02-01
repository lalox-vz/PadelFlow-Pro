"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SwitchAcademyButton({ organizationId, name }: { organizationId: string, name: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSwitch = async () => {
        setLoading(true);
        try {
            // Logic: Update the Super Admin's 'organization_id' in public.users to the target one.
            // Since they are Super Admin, RLS allows this update.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("users")
                .update({ organization_id: organizationId })
                .eq("id", user.id);

            if (error) throw error;

            alert(`Switched context to ${name}. Redirecting to Admin Dashboard...`);
            router.push("/admin/dashboard");

        } catch (error: any) {
            console.error("Switch failed:", error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleSwitch}
            disabled={loading}
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Impersonate"}
        </Button>
    );
}
