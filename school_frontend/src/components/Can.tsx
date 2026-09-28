"use client";

import React, { useEffect, useState } from "react";

interface CanProps {
  feature: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ feature, children, fallback = null }) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const userRole = localStorage.getItem("userRole");
    // Super Admin role ID is 1
    if (userRole === "1") {
      setHasPermission(true);
      return;
    }

    try {
      const permissionsStr = localStorage.getItem("userPermissions");
        if (permissionsStr) {
          const permissions: string[] = JSON.parse(permissionsStr);
          
          if (Array.isArray(feature)) {
            if (feature.some(f => permissions.includes(f))) {
              setHasPermission(true);
              return;
            }
          } else {
            if (permissions.includes(feature)) {
              setHasPermission(true);
              return;
            }
          }
        }
    } catch (e) {
      console.error("Failed to parse permissions", e);
    }
    
    setHasPermission(false);
  }, [feature]);

  if (!isClient) {
    return null; // Avoid hydration mismatch
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};
