<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('class_id')->nullable()->index();
            $table->string('title', 200);
            $table->string('isbn', 50)->nullable()->index();
            $table->string('code', 50)->nullable()->unique();
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('book_packages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('class_id')->index();
            $table->string('name', 150);
            $table->decimal('price', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['class_id', 'name']);
        });
        Schema::create('book_package_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_package_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->unique(['book_package_id', 'book_id']);
        });
        Schema::create('book_stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity');
            $table->enum('movement_type', ['stock_in', 'sale', 'adjustment', 'sale_reversal']);
            $table->string('reference_type', 100)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['book_id', 'created_at']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('book_stock_movements');
        Schema::dropIfExists('book_package_items');
        Schema::dropIfExists('book_packages');
        Schema::dropIfExists('books');
    }
};
