import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const apiSlice = createApi({
  reducerPath: 'api',
  keepUnusedDataFor: 86400, // 24 hours: prevents cache clearing while talking to parents
  refetchOnMountOrArgChange: true, // Silently refetch from API in the background when navigating back
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers) => {
      // Next.js client-side localStorage access
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Results', 'Sessions', 'Classes', 'Categories', 'Sections', 'Majors', 'Students', 'Subjects'],
  endpoints: (builder) => ({
    getAcademicSessions: builder.query<any[], void>({
      query: () => '/academic-sessions',
      providesTags: ['Sessions'],
    }),
    getClasses: builder.query<any[], void>({
      query: () => '/classes',
      providesTags: ['Classes'],
    }),
    getMajors: builder.query<any[], void>({
      query: () => '/majors',
      providesTags: ['Majors'],
    }),
    getTestCategories: builder.query<any[], void>({
      query: () => '/test-categories',
      providesTags: ['Categories'],
    }),
    getSections: builder.query<any[], void>({
      query: () => '/sections',
      providesTags: ['Sections'],
    }),
    getSubjects: builder.query<any[], void>({
      query: () => '/subjects',
      providesTags: ['Subjects'],
    }),
    getStudents: builder.query<any, { page?: number; search?: string; classId?: number | string; majorId?: number | string; sectionId?: number | string }>({
      query: (args) => {
        let url = `/students?page=${args.page || 1}`;
        if (args.search) url += `&search=${encodeURIComponent(args.search)}`;
        if (args.classId) url += `&class_id=${args.classId}`;
        if (args.majorId) url += `&major_id=${args.majorId}`;
        if (args.sectionId) url += `&section_id=${args.sectionId}`;
        return url;
      },
      providesTags: (result, error, arg) => [
        { type: 'Students', id: `PAGE_${arg.page || 1}_SEARCH_${arg.search || ''}_CLASS_${arg.classId || ''}_MAJOR_${arg.majorId || ''}_SECTION_${arg.sectionId || ''}` },
        { type: 'Students', id: 'LIST' }
      ],
    }),
    getResultsSeries: builder.query<any[], { session: string; classId: string; category: string; type: string; section?: string }>({
      query: (args) => {
        let url = `/results/series?academic_session_id=${args.session}&academy_class_id=${args.classId}&test_category_id=${args.category}`;
        if (args.type === 'class_test' && args.section && args.section !== 'all') {
          url += `&section_id=${args.section}`;
        }
        return url;
      },
      providesTags: (result, error, arg) => [{ type: 'Results', id: `${arg.session}-${arg.classId}-${arg.category}-${arg.section || 'all'}` }],
    }),
    getAttentionSeekersSummary: builder.query<any, { sessionId?: string | number; classId?: string | number; sectionId?: string | number; subjectId?: string | number; topThreshold?: number; attentionThreshold?: number }>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args.sessionId && args.sessionId !== 'all') params.append('academic_session_id', String(args.sessionId));
        if (args.classId && args.classId !== 'all') params.append('academy_class_id', String(args.classId));
        if (args.sectionId && args.sectionId !== 'all') params.append('section_id', String(args.sectionId));
        if (args.subjectId && args.subjectId !== 'all') params.append('subject_id', String(args.subjectId));
        if (args.topThreshold !== undefined) params.append('top_threshold', String(args.topThreshold));
        if (args.attentionThreshold !== undefined) params.append('attention_threshold', String(args.attentionThreshold));
        return `/dashboard/attention-seekers/summary?${params.toString()}`;
      },
      keepUnusedDataFor: 60,
      providesTags: ['Results', 'Students'],
    }),
    getAttentionSeekerStudents: builder.query<any, { sessionId?: string | number; classId?: string | number; sectionId?: string | number; subjectId?: string | number; category?: string; search?: string; page?: number; limit?: number; topThreshold?: number; attentionThreshold?: number }>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args.sessionId && args.sessionId !== 'all') params.append('academic_session_id', String(args.sessionId));
        if (args.classId && args.classId !== 'all') params.append('academy_class_id', String(args.classId));
        if (args.sectionId && args.sectionId !== 'all') params.append('section_id', String(args.sectionId));
        if (args.subjectId && args.subjectId !== 'all') params.append('subject_id', String(args.subjectId));
        if (args.category && args.category !== 'all') params.append('category', args.category);
        if (args.search) params.append('search', args.search);
        if (args.page) params.append('page', String(args.page));
        if (args.limit) params.append('limit', String(args.limit));
        if (args.topThreshold !== undefined) params.append('top_threshold', String(args.topThreshold));
        if (args.attentionThreshold !== undefined) params.append('attention_threshold', String(args.attentionThreshold));
        return `/dashboard/attention-seekers/students?${params.toString()}`;
      },
      keepUnusedDataFor: 60,
      providesTags: ['Results', 'Students'],
    }),
    getAttentionSeekerThresholds: builder.query<{ top_threshold: number; attention_threshold: number }, void>({
      query: () => '/dashboard/attention-seekers/thresholds',
      providesTags: ['Results'],
    }),
    updateAttentionSeekerThresholds: builder.mutation<
      { success: boolean; message: string; thresholds: { top_threshold: number; attention_threshold: number } },
      { top_threshold: number; attention_threshold: number }
    >({
      query: (body) => ({
        url: '/dashboard/attention-seekers/thresholds',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Results', 'Students'],
    }),
    sendAttentionSeekerWhatsAppAlert: builder.mutation<
      { success: boolean; message: string; gateway_response?: any },
      {
        studentId: number | string;
        phone?: string;
        avg_percentage?: number;
        grade?: string;
        diagnostic_note?: string;
        tests_taken?: number;
        total_tests?: number;
        weakest_subject?: string;
        message?: string;
      }
    >({
      query: ({ studentId, ...body }) => ({
        url: `/dashboard/attention-seekers/students/${studentId}/whatsapp-alert`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetAcademicSessionsQuery,
  useGetClassesQuery,
  useGetMajorsQuery,
  useGetTestCategoriesQuery,
  useGetSectionsQuery,
  useGetSubjectsQuery,
  useGetStudentsQuery,
  useGetResultsSeriesQuery,
  useGetAttentionSeekersSummaryQuery,
  useGetAttentionSeekerStudentsQuery,
  useGetAttentionSeekerThresholdsQuery,
  useUpdateAttentionSeekerThresholdsMutation,
  useSendAttentionSeekerWhatsAppAlertMutation,
} = apiSlice;

