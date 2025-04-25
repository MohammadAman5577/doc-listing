import React, { Suspense } from 'react'; // Make sure Suspense is imported
import DoctorListingPage from './DoctorListing';// Import the client component
export default function Page() {
    return (
        <Suspense fallback={<div className="container mx-auto p-4 md:p-6 lg:p-8 font-sans text-center text-gray-500">Loading page content...</div>}>
            <DoctorListingPage />
        </Suspense>
    );
}