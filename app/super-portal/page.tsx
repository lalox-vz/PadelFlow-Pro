"use client";
import GlobalAcademyList from "@/components/super-admin/GlobalAcademyList";

export default function SuperPortalPage() {
    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Super Admin Portal ⚡</h1>
                    <p className="text-slate-500">Global Control Center & God Mode</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-xl shadow-sm border">
                    <h3 className="font-semibold text-gray-500 text-sm">System Health</h3>
                    <p className="text-2xl font-bold text-green-600 mt-2">Operational</p>
                    <p className="text-xs text-gray-400 mt-1">DB Connections: Optimized</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border">
                    <h3 className="font-semibold text-gray-500 text-sm">Total Academies</h3>
                    <p className="text-2xl font-bold mt-2">--</p>
                    {/* Ideally we hoist the count state, but simple for now */}
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border">
                    <h3 className="font-semibold text-gray-500 text-sm">Global Users</h3>
                    <p className="text-2xl font-bold mt-2">--</p>
                </div>
            </div>

            <GlobalAcademyList />
        </div>
    );
}
