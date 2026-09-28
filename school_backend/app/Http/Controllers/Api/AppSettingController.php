<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\WhatsAppGatewayService;
use Illuminate\Http\Request;

class AppSettingController extends Controller
{
    // Public endpoint for mobile app launch/splash check
    public function getPublicConfig()
    {
        return response()->json(AppSetting::getAllFormatted());
    }

    // Protected endpoint for admin to view settings
    public function getAdminSettings(WhatsAppGatewayService $whatsAppService)
    {
        $settings = AppSetting::getAllFormatted();
        $balance = $whatsAppService->checkBalance();
        $settings['whatsapp_gateway_status'] = $balance;

        return response()->json($settings);
    }

    // Protected endpoint for admin to update settings
    public function updateAdminSettings(Request $request)
    {
        $request->validate([
            'status' => 'required|in:active,maintenance',
            'maintenance_title' => 'required|string|max:255',
            'maintenance_message' => 'required|string',
            'min_version' => 'required|string|max:50',
            'latest_version' => 'required|string|max:50',
            'update_url' => 'nullable|string|max:500',
            'whatsapp_absent_notification_enabled' => 'nullable|boolean',
        ]);

        AppSetting::set('app_status', $request->status);
        AppSetting::set('maintenance_title', $request->maintenance_title);
        AppSetting::set('maintenance_message', $request->maintenance_message);
        AppSetting::set('min_version', $request->min_version);
        AppSetting::set('latest_version', $request->latest_version);
        AppSetting::set('update_url', $request->update_url ?? '');

        if ($request->has('whatsapp_absent_notification_enabled')) {
            AppSetting::set('whatsapp_absent_notification_enabled', $request->boolean('whatsapp_absent_notification_enabled') ? '1' : '0');
        }

        return response()->json([
            'message' => 'App settings updated successfully',
            'settings' => AppSetting::getAllFormatted()
        ]);
    }
}
