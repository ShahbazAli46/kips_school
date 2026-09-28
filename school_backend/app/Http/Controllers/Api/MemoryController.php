<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Memory;
use App\Models\MemoryImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class MemoryController extends Controller
{
    /**
     * Public website endpoint: list all memories with images
     */
    public function publicIndex()
    {
        $memories = Memory::with('images')
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($memories);
    }

    /**
     * Admin endpoint: list all memories
     */
    public function index()
    {
        $memories = Memory::with('images')
            ->withCount('images')
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($memories);
    }

    /**
     * Admin endpoint: create new memory with multiple images
     */
    public function store(Request $request)
    {
        $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'type'         => 'nullable|in:function,trip,event,other',
            'date'         => 'required|date',
            'images'       => 'nullable|array',
            'images.*'     => 'image|mimes:jpeg,png,jpg,webp|max:5120', // max 5MB per image
            'captions'     => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            $memory = Memory::create([
                'title'       => $request->title,
                'description' => $request->description,
                'type'        => $request->type ?? 'event',
                'date'        => $request->date,
            ]);

            if ($request->hasFile('images')) {
                $files = $request->file('images');
                $captions = $request->input('captions', []);

                foreach ($files as $index => $file) {
                    $path = $file->store('memories', 'public');
                    $caption = $captions[$index] ?? null;

                    MemoryImage::create([
                        'memory_id'  => $memory->id,
                        'image_path' => $path,
                        'caption'    => $caption,
                    ]);
                }
            }

            DB::commit();

            return response()->json($memory->load('images'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create memory', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Admin endpoint: show specific memory
     */
    public function show(Memory $memory)
    {
        return response()->json($memory->load('images'));
    }

    /**
     * Admin endpoint: update memory and upload new images / remove deleted ones
     */
    public function update(Request $request, Memory $memory)
    {
        $request->validate([
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string',
            'type'             => 'nullable|in:function,trip,event,other',
            'date'             => 'required|date',
            'new_images'       => 'nullable|array',
            'new_images.*'     => 'image|mimes:jpeg,png,jpg,webp|max:5120',
            'new_captions'     => 'nullable|array',
            'delete_image_ids' => 'nullable|array',
            'delete_image_ids.*' => 'integer|exists:memory_images,id',
        ]);

        DB::beginTransaction();
        try {
            $memory->update([
                'title'       => $request->title,
                'description' => $request->description,
                'type'        => $request->type ?? 'event',
                'date'        => $request->date,
            ]);

            // Handle image deletions if provided
            if ($request->has('delete_image_ids') && is_array($request->delete_image_ids)) {
                $imagesToDelete = MemoryImage::whereIn('id', $request->delete_image_ids)
                    ->where('memory_id', $memory->id)
                    ->get();

                foreach ($imagesToDelete as $img) {
                    if ($img->image_path && Storage::disk('public')->exists($img->image_path)) {
                        Storage::disk('public')->delete($img->image_path);
                    }
                    $img->delete();
                }
            }

            // Handle new image uploads
            if ($request->hasFile('new_images')) {
                $files = $request->file('new_images');
                $captions = $request->input('new_captions', []);

                foreach ($files as $index => $file) {
                    $path = $file->store('memories', 'public');
                    $caption = $captions[$index] ?? null;

                    MemoryImage::create([
                        'memory_id'  => $memory->id,
                        'image_path' => $path,
                        'caption'    => $caption,
                    ]);
                }
            }

            DB::commit();

            return response()->json($memory->load('images'));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update memory', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Admin endpoint: delete memory and all attached images
     */
    public function destroy(Memory $memory)
    {
        DB::beginTransaction();
        try {
            foreach ($memory->images as $img) {
                if ($img->image_path && Storage::disk('public')->exists($img->image_path)) {
                    Storage::disk('public')->delete($img->image_path);
                }
            }
            $memory->delete();

            DB::commit();
            return response()->json(['message' => 'Memory deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete memory', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Admin endpoint: delete a single memory image
     */
    public function destroyImage(MemoryImage $image)
    {
        if ($image->image_path && Storage::disk('public')->exists($image->image_path)) {
            Storage::disk('public')->delete($image->image_path);
        }
        $image->delete();

        return response()->json(['message' => 'Image removed successfully']);
    }
}
