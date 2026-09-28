<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds missing indexes to the users table that were never present or
     * were implicitly removed (e.g. email unique dropped without a replacement index).
     *
     * Indexes added:
     *  - users_role_deleted_idx   : covers every role-based listing query
     *  - users_email_idx          : fast email lookup for login (OTP flow)
     *  - users_contact_number_idx : fast phone-number lookup for phone login
     *  - users_class_id_idx       : FK column — MySQL needs an explicit index
     *  - users_section_id_idx     : FK column — MySQL needs an explicit index
     *  - users_major_id_idx       : FK column — MySQL needs an explicit index
     *  - users_student_filter_idx : composite covering the most common student list filter
     *  - users_is_active_idx      : used in OTP/login active checks
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {

            // ─────────────────────────────────────────────────
            // 1. role_id + deleted_at
            //    Every listing endpoint filters on both columns:
            //    WHERE role_id = ? AND deleted_at IS NULL
            // ─────────────────────────────────────────────────
            $table->index(['role_id', 'deleted_at'], 'users_role_deleted_idx');

            // ─────────────────────────────────────────────────
            // 2. email
            //    Used by login (OTP flow) and verifyOtp.
            //    NOT unique because the app intentionally supports
            //    multiple profiles (e.g. parent + child) sharing
            //    one email — handled by switchProfile flow.
            // ─────────────────────────────────────────────────
            $table->index('email', 'users_email_idx');

            // ─────────────────────────────────────────────────
            // 3. contact_number
            //    Used by phone-number login flow:
            //    WHERE contact_number = ?
            // ─────────────────────────────────────────────────
            $table->index('contact_number', 'users_contact_number_idx');

            // ─────────────────────────────────────────────────
            // 4. FK columns (class_id, section_id, major_id)
            //    MySQL FK constraints do NOT auto-create indexes.
            //    These are used as WHERE filters constantly.
            // ─────────────────────────────────────────────────
            $table->index('class_id', 'users_class_id_idx');
            $table->index('section_id', 'users_section_id_idx');
            $table->index('major_id', 'users_major_id_idx');

            // ─────────────────────────────────────────────────
            // 5. Composite index for the most common student filter
            //    WHERE role_id = 3 AND class_id = ? AND section_id = ? AND deleted_at IS NULL
            //    This is a covering index for paginated student lists.
            //    Note: major_id omitted — less selective to keep index lean.
            // ─────────────────────────────────────────────────
            $table->index(['role_id', 'class_id', 'section_id', 'deleted_at'], 'users_student_filter_idx');

            // ─────────────────────────────────────────────────
            // 6. is_active
            //    Used in OTP login and salary eligibility checks.
            //    Low cardinality but combined with role_id filters it helps.
            // ─────────────────────────────────────────────────
            $table->index('is_active', 'users_is_active_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_role_deleted_idx');
            $table->dropIndex('users_email_idx');
            $table->dropIndex('users_contact_number_idx');
            $table->dropIndex('users_class_id_idx');
            $table->dropIndex('users_section_id_idx');
            $table->dropIndex('users_major_id_idx');
            $table->dropIndex('users_student_filter_idx');
            $table->dropIndex('users_is_active_idx');
        });
    }
};
