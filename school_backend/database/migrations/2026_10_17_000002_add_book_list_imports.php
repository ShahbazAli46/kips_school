<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('book_lists', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->unsignedBigInteger('class_id')->index();
            $table->string('session_label', 100)->default('');
            $table->json('notes');
            $table->string('source_filename');
            $table->string('source_path');
            $table->char('source_hash', 64);
            $table->longText('raw_text');
            $table->json('source_metadata');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['source_hash', 'class_id', 'session_label'], 'book_lists_source_class_session_unique');
        });
        Schema::table('books', function (Blueprint $table) {
            $table->text('subject')->nullable();
            $table->text('publisher')->nullable();
            $table->text('quantity_text')->nullable();
            $table->string('serial_number', 50)->nullable();
            $table->string('category', 100)->nullable();
            $table->boolean('price_missing')->default(false);
            $table->foreignId('book_list_id')->nullable()->constrained('book_lists')->nullOnDelete();
            $table->unsignedInteger('position')->nullable();
            $table->unique(['book_list_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropUnique(['book_list_id', 'position']);
            $table->dropConstrainedForeignId('book_list_id');
            $table->dropColumn(['subject', 'publisher', 'quantity_text', 'serial_number', 'category', 'price_missing', 'position']);
        });
        Schema::dropIfExists('book_lists');
    }
};
