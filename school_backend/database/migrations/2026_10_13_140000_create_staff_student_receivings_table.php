<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('staff_student_receivings')) {
            Schema::create('staff_student_receivings', function (Blueprint $table) {
                $table->id();
                $table->string('receipt_no', 32)->unique();
                $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('staff_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
                
                $table->decimal('amount', 12, 2);
                $table->string('description', 500);
                $table->string('payment_method', 50)->default('cash');
                $table->date('received_date');
                
                // Handover status between Staff and Super Admin
                $table->enum('status', ['pending_handover', 'received_by_admin'])->default('pending_handover');
                
                // Super Admin handover confirmation details
                $table->foreignId('admin_received_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('admin_received_at')->nullable();
                $table->string('admin_notes', 500)->nullable();
                
                // Link to official Daily Receivings (fee_payments table) once Super Admin receives it
                $table->foreignId('fee_payment_id')->nullable()->constrained('fee_payments')->nullOnDelete();
                
                // WhatsApp parent notification tracking
                $table->string('parent_phone', 30)->nullable();
                $table->enum('whatsapp_status', ['pending', 'sent', 'failed', 'no_phone'])->default('pending');
                $table->string('whatsapp_message_id', 100)->nullable();
                $table->timestamp('whatsapp_sent_at')->nullable();
                $table->text('whatsapp_error')->nullable();
                
                $table->timestamps();

                // High-performance composite and single-column indexes optimized for 4-5 years of high-volume entries
                $table->index(['status', 'received_date'], 'ssr_status_date_idx');
                $table->index(['staff_id', 'status'], 'ssr_staff_status_idx');
                $table->index(['student_id', 'received_date'], 'ssr_student_date_idx');
                $table->index('received_date', 'ssr_date_idx');
                $table->index('admin_received_at', 'ssr_admin_rec_at_idx');
                $table->index(['academic_session_id', 'status'], 'ssr_session_status_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_student_receivings');
    }
};
