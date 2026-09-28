"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, BookOpen, GraduationCap, Award } from "lucide-react";

interface Subject {
    id: number;
    name: string;
}

interface Major {
    id: number;
    name: string;
    subjects?: Subject[];
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export default function CourseCatalog() {
    const [filter, setFilter] = useState("All Courses");
    const [majors, setMajors] = useState<Major[]>([]);
    const [loadingMajors, setLoadingMajors] = useState(true);

    useEffect(() => {
        async function fetchMajors() {
            try {
                const res = await fetch(`${API}/website/majors`);
                if (res.ok) {
                    const data = await res.json();
                    setMajors(data);
                }
            } catch (err) {
                console.error("Failed to fetch majors:", err);
            } finally {
                setLoadingMajors(false);
            }
        }
        fetchMajors();
    }, []);

    return (
        <div className="bg-brand-50 w-full">
            {/* Course Filter */}
            <section className="py-8 border-b border-brand-200 bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-wrap gap-4 justify-center">
                    {["All Courses", "Matriculation", "Intermediate", "Majors"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`relative px-6 py-2 rounded-full font-medium transition-colors ${
                                filter === tab
                                    ? "text-white border border-transparent"
                                    : "border border-gray-300 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            {filter === tab && (
                                <motion.div
                                    layoutId="courses-active-tab"
                                    className="absolute inset-0 bg-brand-800 rounded-full shadow-md"
                                    transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                                />
                            )}
                            <span className="relative z-10">{tab}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Course Catalog */}
            <section className="py-20 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    
                    {/* Category: Matriculation */}
                    {(filter === "All Courses" || filter === "Matriculation") && (
                        <div className="mb-20">
                            <div className="flex items-center gap-4 mb-10">
                                <span className="w-12 h-[2px] bg-brand-800"></span>
                                <h2 className="text-3xl font-bold text-gray-900">Matriculation Tracks</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {/* Matric Science */}
                                <div className="bg-white border border-gray-200 p-8 hover:shadow-lg transition-shadow flex flex-col h-full rounded-2xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-800">
                                            <BookOpen size={24} />
                                        </div>
                                        <span className="text-sm bg-brand-50 text-brand-800 px-3 py-1 rounded-full font-medium">2 Years</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Matric (Science)</h3>
                                    <p className="text-gray-600 mb-6 flex-grow">
                                        A foundational program focusing on core scientific principles for students aiming for FSc or medical/engineering careers.
                                    </p>
                                    <div className="border-t border-gray-100 pt-6 mb-8">
                                        <h4 className="text-sm font-semibold text-brand-800 uppercase tracking-wider mb-3">Key Subjects</h4>
                                        <ul className="space-y-2">
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Physics &amp; Chemistry
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Biology / Computer Science
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Mathematics
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Matric Arts */}
                                <div className="bg-white border border-gray-200 p-8 hover:shadow-lg transition-shadow flex flex-col h-full rounded-2xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-800">
                                            <GraduationCap size={24} />
                                        </div>
                                        <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">2 Years</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Matric (Arts)</h3>
                                    <p className="text-gray-600 mb-6 flex-grow">
                                        Designed for students pursuing social sciences, humanities, and creative fields.
                                    </p>
                                    <div className="border-t border-gray-100 pt-6 mb-8">
                                        <h4 className="text-sm font-semibold text-brand-800 uppercase tracking-wider mb-3">Key Subjects</h4>
                                        <ul className="space-y-2">
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> General Science
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Islamic Studies
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Humanities Electives
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Category: Intermediate */}
                    {(filter === "All Courses" || filter === "Intermediate") && (
                        <div className="mb-20">
                            <div className="flex items-center gap-4 mb-10">
                                <span className="w-12 h-[2px] bg-brand-800"></span>
                                <h2 className="text-3xl font-bold text-gray-900">Intermediate Programs</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {/* FSc Pre-Medical */}
                                <div className="bg-white border border-gray-200 p-8 hover:shadow-lg transition-shadow flex flex-col h-full rounded-2xl border-t-4 border-t-brand-800">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-800">
                                            <Award size={24} />
                                        </div>
                                        <span className="text-sm bg-brand-50 text-brand-800 px-3 py-1 rounded-full font-medium">2 Years</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">FSc Pre-Medical</h3>
                                    <p className="text-gray-600 mb-6 flex-grow">
                                        The premier choice for aspiring doctors and medical professionals, focusing on biological sciences.
                                    </p>
                                    <div className="border-t border-gray-100 pt-6 mb-8">
                                        <h4 className="text-sm font-semibold text-brand-800 uppercase tracking-wider mb-3">Key Subjects</h4>
                                        <ul className="space-y-2">
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Biology
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Chemistry
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Physics
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* FSc Pre-Engineering */}
                                <div className="bg-white border border-gray-200 p-8 hover:shadow-lg transition-shadow flex flex-col h-full rounded-2xl border-t-4 border-t-brand-800">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-800">
                                            <BookOpen size={24} />
                                        </div>
                                        <span className="text-sm bg-brand-50 text-brand-800 px-3 py-1 rounded-full font-medium">2 Years</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">FSc Pre-Engineering</h3>
                                    <p className="text-gray-600 mb-6 flex-grow">
                                        Critical path for engineering careers, with advanced mathematics and physical science modules.
                                    </p>
                                    <div className="border-t border-gray-100 pt-6 mb-8">
                                        <h4 className="text-sm font-semibold text-brand-800 uppercase tracking-wider mb-3">Key Subjects</h4>
                                        <ul className="space-y-2">
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Mathematics
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Physics
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Chemistry
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* ICS */}
                                <div className="bg-white border border-gray-200 p-8 hover:shadow-lg transition-shadow flex flex-col h-full rounded-2xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-800">
                                            <GraduationCap size={24} />
                                        </div>
                                        <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">2 Years</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">ICS (Computer Science)</h3>
                                    <p className="text-gray-600 mb-6 flex-grow">
                                        Tailored for the digital age, focusing on software development, logic, and hardware basics.
                                    </p>
                                    <div className="border-t border-gray-100 pt-6 mb-8">
                                        <h4 className="text-sm font-semibold text-brand-800 uppercase tracking-wider mb-3">Key Subjects</h4>
                                        <ul className="space-y-2">
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Computer Science
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Mathematics
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Statistics / Physics
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Category: Majors (Dynamic from Database) */}
                    {(filter === "All Courses" || filter === "Majors") && (
                        <div className="mb-20">
                            <div className="flex items-center gap-4 mb-10">
                                <span className="w-12 h-[2px] bg-brand-800"></span>
                                <h2 className="text-3xl font-bold text-gray-900">Academic Majors &amp; Disciplines</h2>
                            </div>
                            
                            {loadingMajors ? (
                                <div className="text-center py-12 text-gray-500">Loading majors...</div>
                            ) : majors.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">No majors found.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {majors.map((major) => (
                                        <div key={major.id} className="bg-white border border-gray-200 p-8 hover:shadow-lg transition-shadow flex flex-col h-full rounded-2xl border-t-4 border-t-brand-800">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-800">
                                                    <GraduationCap size={24} />
                                                </div>
                                                <span className="text-sm bg-brand-50 text-brand-800 px-3 py-1 rounded-full font-medium">Major</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-4">{major.name}</h3>
                                            <p className="text-gray-600 mb-6 flex-grow">
                                                Specialized academic track providing core proficiency and comprehensive course structure in {major.name}.
                                            </p>
                                            {major.subjects && major.subjects.length > 0 && (
                                                <div className="border-t border-gray-100 pt-6 mb-8">
                                                    <h4 className="text-sm font-semibold text-brand-800 uppercase tracking-wider mb-3">Enrolled Subjects</h4>
                                                    <ul className="space-y-2">
                                                        {major.subjects.map((sub) => (
                                                            <li key={sub.id} className="flex items-center gap-2 text-gray-600 text-sm">
                                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> {sub.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
