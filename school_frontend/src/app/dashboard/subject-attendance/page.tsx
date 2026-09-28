"use client";

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Edit2, X } from 'lucide-react'
import CustomDropdown from '@/components/CustomDropdown'
import DashboardLayout from '@/components/DashboardLayout'

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export default function SubjectAttendancePage() {
    const [attendances, setAttendances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
    
    // Metadata for dropdowns
    const [teachers, setTeachers] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [sections, setSections] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])

    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        status: '',
        teacher_id: '',
        class_id: '',
        section_id: '',
        subject_id: '',
    })

    const [editModal, setEditModal] = useState<{
        isOpen: boolean;
        record: any;
        newStatus: string;
    }>({
        isOpen: false,
        record: null,
        newStatus: ''
    })

    // Fetch metadata
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [resTeachers, resClasses, resSections, resSubjects] = await Promise.all([
                    fetch(`${API}/teachers`, { headers: getAuthHeaders() }),
                    fetch(`${API}/classes`, { headers: getAuthHeaders() }),
                    fetch(`${API}/sections`, { headers: getAuthHeaders() }),
                    fetch(`${API}/subjects`, { headers: getAuthHeaders() })
                ])

                const extractArray = (data: any) => Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

                if (resTeachers.ok) {
                    const data = await resTeachers.json()
                    setTeachers(extractArray(data))
                }
                if (resClasses.ok) {
                    const data = await resClasses.json()
                    setClasses(extractArray(data))
                }
                if (resSections.ok) {
                    const data = await resSections.json()
                    setSections(extractArray(data))
                }
                if (resSubjects.ok) {
                    const data = await resSubjects.json()
                    setSubjects(extractArray(data))
                }
            } catch (err) {
                console.error("Failed to load metadata", err)
            }
        }
        fetchMetadata()
    }, [])

    useEffect(() => {
        fetchAttendances(1)
    }, [filters])

    const fetchAttendances = async (page = 1) => {
        setLoading(true)
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                date: filters.date,
                status: filters.status,
                teacher_id: filters.teacher_id,
                class_id: filters.class_id,
                section_id: filters.section_id,
                subject_id: filters.subject_id,
            }).toString()

            const res = await fetch(`${API}/admin/subject-attendance?${queryParams}`, {
                headers: getAuthHeaders()
            })

            if (!res.ok) throw new Error('Failed to fetch')
            
            const data = await res.json()
            setAttendances(data.data.data || [])
            setPagination({
                current_page: data.data.current_page || 1,
                last_page: data.data.last_page || 1,
                total: data.data.total || 0
            })
        } catch (error) {
            alert('Failed to load attendances')
        } finally {
            setLoading(false)
        }
    }

    const openEditModal = (record: any) => {
        setEditModal({
            isOpen: true,
            record,
            newStatus: record.status
        })
    }

    const handleUpdateStatus = async () => {
        if (!editModal.record) return
        try {
            const res = await fetch(`${API}/admin/subject-attendance/${editModal.record.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: editModal.newStatus })
            })

            if (!res.ok) throw new Error('Failed to update')

            alert('Attendance updated')
            setEditModal({ isOpen: false, record: null, newStatus: '' })
            fetchAttendances(pagination.current_page)
        } catch (error) {
            alert('Update failed')
        }
    }

    const handleFilterChange = (name: string, value: any) => {
        setFilters(prev => {
            const updated = { ...prev, [name]: value }
            // If class changes and current section doesn't belong to it, we can keep or reset
            if (name === 'class_id') {
                updated.section_id = ''
            }
            return updated
        })
    }

    // Filter sections based on selected class if available
    const availableSections = React.useMemo(() => {
        if (!filters.class_id) return sections
        const selectedClassObj = classes.find((c: any) => String(c.id) === String(filters.class_id))
        if (selectedClassObj && Array.isArray(selectedClassObj.sections) && selectedClassObj.sections.length > 0) {
            return selectedClassObj.sections
        }
        return sections
    }, [filters.class_id, classes, sections])

    // Prepare dropdown options
    const teacherOptions = [{ label: "All Teachers", value: "" }, ...teachers.map((t: any) => ({ label: t.name, value: t.id }))]
    const classOptions = [{ label: "All Classes", value: "" }, ...classes.map((c: any) => ({ label: c.name, value: c.id }))]
    const sectionOptions = [{ label: "All Sections", value: "" }, ...availableSections.map((s: any) => ({ label: s.name, value: s.id }))]
    const subjectOptions = [{ label: "All Subjects", value: "" }, ...subjects.map((s: any) => ({ label: s.name, value: s.id }))]
    const statusOptions = [
        { label: "All Statuses", value: "" },
        { label: "Present", value: "present" },
        { label: "Absent", value: "absent" },
        { label: "Late", value: "late" }
    ]

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: "#0f224a" }}>Subject-Wise Attendance</h1>
                    <p className="text-sm font-medium opacity-80" style={{ color: "#0f224a" }}>Monitor and manage subject attendance records</p>
                </div>

            <div className="bg-white rounded-2xl shadow-sm border p-5" style={{ borderColor: "#bfdbfe" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "#2563eb" }}>Date</label>
                        <input 
                            type="date" 
                            value={filters.date}
                            onChange={e => setFilters({...filters, date: e.target.value})}
                            className="flex h-[46px] w-full rounded-xl border outline-none font-medium px-4 transition focus:ring-2 focus:ring-[#2563eb]/20 text-sm shadow-sm"
                            style={{ borderColor: "#bfdbfe", color: "#0f224a", background: "#fff" }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "#2563eb" }}>Teacher</label>
                        <CustomDropdown name="teacher_id" value={filters.teacher_id} options={teacherOptions} onChange={handleFilterChange} placeholder="All Teachers" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "#2563eb" }}>Class</label>
                        <CustomDropdown name="class_id" value={filters.class_id} options={classOptions} onChange={handleFilterChange} placeholder="All Classes" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "#2563eb" }}>Section</label>
                        <CustomDropdown name="section_id" value={filters.section_id} options={sectionOptions} onChange={handleFilterChange} placeholder="All Sections" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "#2563eb" }}>Subject</label>
                        <CustomDropdown name="subject_id" value={filters.subject_id} options={subjectOptions} onChange={handleFilterChange} placeholder="All Subjects" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "#2563eb" }}>Status</label>
                        <CustomDropdown name="status" value={filters.status} options={statusOptions} onChange={handleFilterChange} placeholder="All Statuses" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="uppercase text-xs font-black tracking-wider border-b" style={{ background: "#f0f4f8", color: "#2563eb", borderColor: "#bfdbfe" }}>
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Class & Section</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Marked By (Teacher)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium opacity-50">Loading...</td>
                                </tr>
                            ) : attendances.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium opacity-50">No records found for the selected filters</td>
                                </tr>
                            ) : (
                                attendances.map((record, idx) => (
                                    <tr key={record.id} className="border-b hover:bg-[#f0f4f8]/50 transition-colors" style={{ borderColor: "#bfdbfe" }}>
                                        <td className="px-6 py-4 font-bold" style={{ color: "#0f224a" }}>
                                            {record.student?.name}
                                            {record.student?.roll_number && (
                                                <span className="block text-xs font-normal opacity-60">Roll #: {record.student.roll_number}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium" style={{ color: "#0f224a" }}>
                                            {record.student?.academy_class?.name || "N/A"} 
                                            {record.student?.section?.name ? ` - ${record.student.section.name}` : ''}
                                        </td>
                                        <td className="px-6 py-4 font-medium" style={{ color: "#0f224a" }}>{record.subject?.name}</td>
                                        <td className="px-6 py-4 font-medium" style={{ color: "#0f224a" }}>{record.teacher?.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                                record.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                                                record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => openEditModal(record)}
                                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold transition-colors hover:bg-gray-100"
                                                style={{ color: "#2563eb" }}
                                            >
                                                <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && pagination.total > 0 && (
                    <div className="p-4 flex items-center justify-between text-sm font-medium border-t" style={{ borderColor: "#bfdbfe", color: "#0f224a" }}>
                        <span className="opacity-70">
                            Showing Page {pagination.current_page} of {pagination.last_page} ({pagination.total} records)
                        </span>
                        <div className="flex gap-2">
                            <button 
                                disabled={pagination.current_page === 1}
                                onClick={() => fetchAttendances(pagination.current_page - 1)}
                                className="p-2 rounded-lg border disabled:opacity-50 transition-colors hover:bg-gray-50"
                                style={{ borderColor: "#bfdbfe" }}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button 
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => fetchAttendances(pagination.current_page + 1)}
                                className="p-2 rounded-lg border disabled:opacity-50 transition-colors hover:bg-gray-50"
                                style={{ borderColor: "#bfdbfe" }}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Modal for Edit */}
            {editModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditModal({ ...editModal, isOpen: false })} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 border" style={{ borderColor: "#bfdbfe" }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black" style={{ color: "#0f224a" }}>Edit Attendance</h3>
                            <button onClick={() => setEditModal({ ...editModal, isOpen: false })} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 opacity-70" />
                            </button>
                        </div>
                        
                        {editModal.record && (
                            <div className="space-y-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1" style={{ color: "#0f224a" }}>Student</p>
                                    <p className="font-bold text-lg" style={{ color: "#0f224a" }}>{editModal.record.student?.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide mb-1 block" style={{ color: "#2563eb" }}>Status</label>
                                    <select 
                                        value={editModal.newStatus}
                                        onChange={e => setEditModal({...editModal, newStatus: e.target.value})}
                                        className="flex h-12 w-full rounded-xl border outline-none font-medium px-4 py-3 text-base transition focus:ring-2 focus:ring-[#2563eb]/20"
                                        style={{ borderColor: "#bfdbfe", color: "#0f224a", background: "#f0f4f8" }}
                                    >
                                        <option value="present">Present</option>
                                        <option value="absent">Absent</option>
                                        <option value="late">Late</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setEditModal({ ...editModal, isOpen: false })}
                                className="flex-1 px-4 py-3 rounded-xl font-bold border transition-colors hover:bg-gray-50"
                                style={{ borderColor: "#bfdbfe", color: "#0f224a" }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateStatus}
                                className="flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all transform active:scale-95 shadow-md"
                                style={{ background: "#2563eb" }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </DashboardLayout>
    )
}
