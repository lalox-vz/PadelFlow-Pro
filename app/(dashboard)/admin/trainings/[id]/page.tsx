"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrainingSession } from "@/types"

export default function TrainingDetailsPage() {
    const { id } = useParams()
    const router = useRouter()
    const [attendees, setAttendees] = useState<any[]>([])
    const [trainingData, setTrainingData] = useState<TrainingSession | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (id) {
            fetchTrainingDetails()
            fetchAttendees()
        }
    }, [id])

    const fetchTrainingDetails = async () => {
        const { data } = await supabase.from('trainings').select('*').eq('id', id).single()
        if (data) setTrainingData(data)
    }

    const fetchAttendees = async () => {
        const { data } = await supabase
            .from('registrations')
            .select('*, user:users(*)')
            .eq('training_id', id)
            .eq('status', 'confirmed')
        if (data) setAttendees(data)
        setLoading(false)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!trainingData) return
        setSaving(true)

        const { error } = await supabase
            .from('trainings')
            .update({
                title: trainingData.title,
                instructor: trainingData.instructor,
                start_time: trainingData.start_time,
                end_time: trainingData.end_time,
                capacity: trainingData.capacity,
                type: trainingData.type
            })
            .eq('id', id)

        if (error) {
            alert('Error updating training: ' + error.message)
        } else {
            alert('Training updated successfully!')
        }
        setSaving(false)
    }

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this training? This action cannot be undone.")) return

        const { error } = await supabase.from('trainings').delete().eq('id', id)
        if (error) {
            alert('Error deleting training: ' + error.message)
        } else {
            alert('Training deleted')
            router.push('/admin/trainings')
        }
    }

    if (loading) return <div className="p-10">Loading...</div>
    if (!trainingData) return <div className="p-10">Training not found</div>

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Edit Training & Attendance</h1>
                <Button variant="destructive" onClick={handleDelete}>Delete Training</Button>
            </div>

            <div className="bg-white shadow p-6 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Training Details</h2>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <Input
                                value={trainingData.title}
                                onChange={e => setTrainingData({ ...trainingData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={trainingData.type}
                                onChange={e => setTrainingData({ ...trainingData, type: e.target.value as any })}
                            >
                                <option value="Functional">Functional</option>
                                <option value="Yoga">Yoga</option>
                                <option value="Hyrox">Hyrox</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Start Time</label>
                            <Input
                                type="datetime-local"
                                value={new Date(trainingData.start_time).toISOString().slice(0, 16)}
                                onChange={e => setTrainingData({ ...trainingData, start_time: new Date(e.target.value).toISOString() })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">End Time</label>
                            <Input
                                type="datetime-local"
                                value={new Date(trainingData.end_time).toISOString().slice(0, 16)}
                                onChange={e => setTrainingData({ ...trainingData, end_time: new Date(e.target.value).toISOString() })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Instructor</label>
                            <Input
                                value={trainingData.instructor || ''}
                                onChange={e => setTrainingData({ ...trainingData, instructor: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Capacity</label>
                            <Input
                                type="number"
                                value={trainingData.capacity}
                                onChange={e => setTrainingData({ ...trainingData, capacity: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Registered Attendees ({attendees.length})</h3>
                </div>
                {attendees.length === 0 ? (
                    <div className="p-6 text-gray-500">No attendees yet.</div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {attendees.map((att) => (
                            <li key={att.id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{att.user?.full_name || 'Unknown User'}</p>
                                        <p className="text-sm text-gray-500">{att.user?.email}</p>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Confirmed
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
