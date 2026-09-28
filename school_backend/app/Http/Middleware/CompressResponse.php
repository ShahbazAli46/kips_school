<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\Response;

class CompressResponse
{
    /**
     * Handle an incoming request and compress the response using Zstandard (zstd), Brotli (br), or Gzip.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Skip binary files and streaming responses
        if ($response instanceof BinaryFileResponse || $response instanceof StreamedResponse) {
            return $response;
        }

        // Skip if already encoded or empty
        if ($response->headers->has('Content-Encoding')) {
            return $response;
        }

        $content = $response->getContent();
        if ($content === false || strlen($content) < 512) {
            return $response;
        }

        $acceptEncoding = $request->header('Accept-Encoding', '');

        // 1. Zstandard (zstd) - Highest speed and superior compression ratio
        if (str_contains($acceptEncoding, 'zstd') && function_exists('zstd_compress')) {
            $compressed = zstd_compress($content, 3);
            if ($compressed !== false && strlen($compressed) < strlen($content)) {
                $response->setContent($compressed);
                $response->headers->set('Content-Encoding', 'zstd');
                $response->headers->set('X-Compression-Algorithm', 'zstd');
                $response->headers->set('Vary', 'Accept-Encoding', false);
                $response->headers->remove('Content-Length');
                return $response;
            }
        }

        // 2. Brotli (br)
        if (str_contains($acceptEncoding, 'br') && function_exists('brotli_compress')) {
            $compressed = brotli_compress($content, 5);
            if ($compressed !== false && strlen($compressed) < strlen($content)) {
                $response->setContent($compressed);
                $response->headers->set('Content-Encoding', 'br');
                $response->headers->set('X-Compression-Algorithm', 'brotli');
                $response->headers->set('Vary', 'Accept-Encoding', false);
                $response->headers->remove('Content-Length');
                return $response;
            }
        }

        // 3. Gzip (gz) fallback
        if (str_contains($acceptEncoding, 'gzip') && function_exists('gzencode')) {
            $compressed = gzencode($content, 6);
            if ($compressed !== false && strlen($compressed) < strlen($content)) {
                $response->setContent($compressed);
                $response->headers->set('Content-Encoding', 'gzip');
                $response->headers->set('X-Compression-Algorithm', 'gzip');
                $response->headers->set('Vary', 'Accept-Encoding', false);
                $response->headers->remove('Content-Length');
                return $response;
            }
        }

        return $response;
    }
}
