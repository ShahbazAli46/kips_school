<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Firebase Project ID
    |--------------------------------------------------------------------------
    | The Google Cloud / Firebase project identifier.
    */
    'project_id' => env('FIREBASE_PROJECT_ID', 'umaracademy-4e95f'),

    /*
    |--------------------------------------------------------------------------
    | Service Account Credentials File
    |--------------------------------------------------------------------------
    | Absolute or relative path to your service account JSON credentials file.
    */
    'credentials_path' => env('FIREBASE_CREDENTIALS', storage_path('app/firebase/firebase_credentials.json')),

    /*
    |--------------------------------------------------------------------------
    | Service Account Direct Environment Variables
    |--------------------------------------------------------------------------
    | Alternatively, provide client email and private key directly in .env.
    */
    'client_email' => env('FIREBASE_CLIENT_EMAIL', null),
    'private_key' => env('FIREBASE_PRIVATE_KEY', null),
];
