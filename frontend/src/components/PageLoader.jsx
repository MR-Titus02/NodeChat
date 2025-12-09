import React from 'react'
import { LoaderIcon } from 'lucide-react';


function PageLoader() {
  return (
    <div className="flex items-center justify-center gap-4 h-screen">
        <LoaderIcon className="animate-spin size-10 text-white" />
    </div>    
)
}

export default PageLoader