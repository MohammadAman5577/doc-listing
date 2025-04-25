"use client"; // This component needs client-side interactivity

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Define the Doctor type based on the provided JSON structure
interface Doctor {
  id: string;
  name: string;
  name_initials: string;
  photo: string; // Changed from profile_img
  doctor_introduction: string;
  specialities: { name: string }[]; // Changed from specialty: string
  fees: string;
  experience: string;
  languages: string[];
  clinic: {
    name: string;
    address: {
      locality: string;
      city: string;
      address_line1: string;
      location: string;
      logo_url?: string; // Optional logo
    };
  };
  video_consult: boolean; // Added based on JSON
  in_clinic: boolean; // Added based on JSON
  // ratings?: number; // Add if ratings might exist in the full dataset, otherwise remove
}


// Helper function to parse fees (e.g., "₹ 500" -> 500)
const parseFee = (feeString: string): number => {
  // More robust parsing for currency symbols and potential commas
  return parseInt(feeString?.replace(/[^0-9.]/g, ""), 10) || 0;
};

// Helper function to parse experience (e.g., "13 Years of experience" -> 13)
const parseExperience = (expString: string): number => {
  // Handle cases where the string might not follow the exact format
  const match = expString?.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export default function DoctorListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // == State ==
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Doctor[]>([]);

  // Filter State
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null); // "video" or "clinic"
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string | null>(null); // 'fees' or 'experience'

  // == Data Fetching ==
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Using the provided API endpoint
        const response = await fetch(
          "https://srijandubey.github.io/campus-api-mock/SRM-C1-25.json"
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Doctor[] = await response.json();
        // Basic validation or transformation if needed
        setAllDoctors(data || []); // Ensure data is an array
      } catch (e) {
        console.error("Failed to fetch doctors:", e);
        setError(
          `Failed to load doctor data. ${e instanceof Error ? e.message : "Please try again later."}`
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []); // Fetch only once on mount

  // == URL Parameter Synchronization ==
  // Initialize state from URL params on mount and when params change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    setSearchTerm(params.get("search") || "");
    setSelectedConsultation(params.get("consultation")); // e.g., "video", "clinic"
    setSelectedSpecialties(params.getAll("specialty") || []); // Specialty names
    setSortBy(params.get("sort")); // "fees", "experience"
  }, [searchParams]);

  // Update URL params whenever filters change
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedConsultation) params.set("consultation", selectedConsultation);
    selectedSpecialties.forEach((spec) => params.append("specialty", spec));
    if (sortBy) params.set("sort", sortBy);

    // Use replace to avoid pushing duplicate history entries for filter changes
    // Construct the path relative to the current page or provide the full path
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchTerm, selectedConsultation, selectedSpecialties, sortBy, router]);

  // Call updateUrlParams whenever a relevant state changes
  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]); // Depends on the memoized function

  // == Filtering and Sorting Logic ==
  useEffect(() => {
    let result = [...allDoctors];

    // 1. Search Filter (applied first based on search term state)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter((doctor) =>
        doctor.name.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // 2. Consultation Type Filter (Updated logic)
    if (selectedConsultation) {
      result = result.filter((doctor) => {
        if (selectedConsultation === "video") return doctor.video_consult;
        if (selectedConsultation === "clinic") return doctor.in_clinic;
        return false; // Should not happen if values are controlled
      });
    }

    // 3. Specialties Filter (Updated logic for array)
    if (selectedSpecialties.length > 0) {
      result = result.filter((doctor) =>
        // Check if at least one of the doctor's specialties is in the selected list
        doctor.specialities.some(specObj => selectedSpecialties.includes(specObj.name))
      );
    }

    // 4. Sorting
    if (sortBy) {
      result.sort((a, b) => {
        if (sortBy === "fees") {
          return parseFee(a.fees) - parseFee(b.fees); // Ascending
        } else if (sortBy === "experience") {
          return parseExperience(b.experience) - parseExperience(a.experience); // Descending
        }
        return 0;
      });
    }

    setFilteredDoctors(result);

  }, [allDoctors, searchTerm, selectedConsultation, selectedSpecialties, sortBy]);


  // == Autocomplete Suggestions Logic ==
  useEffect(() => {
    if (searchTerm.length > 0 && allDoctors.length > 0) {
       const lowerSearchTerm = searchTerm.toLowerCase();
      const matches = allDoctors
        .filter((doctor) =>
          doctor.name.toLowerCase().includes(lowerSearchTerm)
        )
        .slice(0, 5); // Suggest up to 5 matches
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, allDoctors]);


  // == Event Handlers ==
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSuggestionClick = (doctorName: string) => {
    setSearchTerm(doctorName);
    setSuggestions([]); // Hide suggestions after selection
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent full page reload
    setSuggestions([]); // Hide suggestions on submit
    // Filtering runs via useEffect
  };

  const handleConsultationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedConsultation(event.target.value); // Value will be "video" or "clinic"
  };

  const handleSpecialtyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setSelectedSpecialties((prev) =>
      checked ? [...prev, value] : prev.filter((spec) => spec !== value)
    );
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSortBy(event.target.value); // Value will be "fees" or "experience"
  };

  // == Unique Specialties for Filters (Updated logic) ==
  const uniqueSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    // Iterate through each doctor and then their specialties array
    allDoctors.forEach((doctor) => {
        doctor.specialities?.forEach(specObj => specialties.add(specObj.name));
    });

    // Keep the sorting logic if needed, otherwise just return sorted array
    const testIdOrder = [
        "General Physician", "Dentist", "Dermatologist", "Paediatrician", "Gynaecologist",
        "ENT", "Diabetologist", "Cardiologist", "Physiotherapist", "Endocrinologist",
        "Orthopaedic", "Ophthalmologist", "Gastroenterologist", "Pulmonologist", "Psychiatrist",
        "Urologist", "Dietitian/Nutritionist", "Psychologist", "Sexologist", "Nephrologist",
        "Neurologist", "Oncologist", "Ayurveda", "Homeopath"
    ]; // Example order

    const sortedSpecialties = [...specialties].sort((a, b) => {
        const indexA = testIdOrder.indexOf(a);
        const indexB = testIdOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });
    return sortedSpecialties;
  }, [allDoctors]);

  // == Rendering ==
  return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 font-sans">
        {/* Autocomplete Header */}
        <div className="mb-6 relative">
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <input
              type="text"
              placeholder="Search for doctors by name..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="autocomplete-input"
              aria-autocomplete="list"
              aria-controls="autocomplete-suggestions"
            />
            {/* Optional: Add a search icon button if needed */}
            {/* <button type="submit" className="ml-2 px-3 py-2 bg-blue-500 text-white rounded">Search</button> */}
          </form>
          {suggestions.length > 0 && (
            <ul
              id="autocomplete-suggestions"
              className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
              role="listbox"
            >
              {suggestions.map((doctor) => (
                <li
                  key={doctor.id}
                  onClick={() => handleSuggestionClick(doctor.name)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  data-testid="suggestion-item"
                  role="option"
                  aria-selected="false" // Manage aria-selected if implementing keyboard navigation
                >
                  {doctor.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Filter Panel */}
          <aside className="w-full md:w-1/4 lg:w-1/5 border rounded-lg p-4 self-start shadow bg-white">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Filters</h2>

            {/* Consultation Mode (Updated values) */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2" data-testid="filter-header-moc">Consultation Mode</h3>
              <div className="flex flex-col space-y-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="consultationType"
                    value="video" // Changed value
                    checked={selectedConsultation === "video"}
                    onChange={handleConsultationChange}
                    className="form-radio text-blue-600 focus:ring-blue-500"
                    data-testid="filter-video-consult"
                  />
                  <span>Video Consult</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="consultationType"
                    value="clinic" // Changed value
                    checked={selectedConsultation === "clinic"}
                    onChange={handleConsultationChange}
                    className="form-radio text-blue-600 focus:ring-blue-500"
                    data-testid="filter-in-clinic"
                  />
                  <span>In Clinic</span>
                </label>
                {/* Clear option */}
                 {selectedConsultation && (
                   <button
                     onClick={() => setSelectedConsultation(null)}
                     className="text-sm text-blue-600 hover:underline mt-1 text-left"
                   >
                     Clear
                   </button>
                 )}
              </div>
            </div>

            {/* Specialties (Uses updated uniqueSpecialties) */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2" data-testid="filter-header-speciality">Specialty</h3>
              <div className="flex flex-col space-y-1 max-h-60 overflow-y-auto pr-2"> {/* Added padding-right for scrollbar */}
                {uniqueSpecialties.map((specialty) => (
                  <label key={specialty} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={specialty} // Value is the specialty name string
                      checked={selectedSpecialties.includes(specialty)}
                      onChange={handleSpecialtyChange}
                      className="form-checkbox text-blue-600 rounded focus:ring-blue-500"
                      // Generate test-id safely
                      data-testid={`filter-specialty-${specialty.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    />
                    <span>{specialty}</span>
                  </label>
                ))}
                 {/* Clear All for specialties */}
                  {selectedSpecialties.length > 0 && (
                    <button
                        onClick={() => setSelectedSpecialties([])}
                        className="text-sm text-blue-600 hover:underline mt-1 text-left"
                    >
                        Clear Specialties
                    </button>
                  )}
              </div>
            </div>

            {/* Sort */}
            <div>
              <h3 className="font-semibold mb-2" data-testid="filter-header-sort">Sort By</h3>
              <div className="flex flex-col space-y-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sortBy"
                    value="fees" // Value matches state
                    checked={sortBy === "fees"}
                    onChange={handleSortChange}
                    className="form-radio text-blue-600 focus:ring-blue-500"
                    data-testid="sort-fees"
                  />
                  <span>Fees (Ascending)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sortBy"
                    value="experience" // Value matches state
                    checked={sortBy === "experience"}
                    onChange={handleSortChange}
                    className="form-radio text-blue-600 focus:ring-blue-500"
                    data-testid="sort-experience"
                  />
                  <span>Experience (Descending)</span>
                </label>
                 {/* Clear Sort */}
                  {sortBy && (
                    <button
                        onClick={() => setSortBy(null)}
                        className="text-sm text-blue-600 hover:underline mt-1 text-left"
                    >
                        Clear Sort
                    </button>
                  )}
              </div>
            </div>
          </aside>

          {/* Doctor List */}
          <main className="w-full md:w-3/4 lg:w-4/5">
            {isLoading && <p className="text-center text-gray-500 py-10">Loading doctors...</p>}
            {error && <p className="text-center text-red-600 bg-red-100 p-4 rounded-lg shadow">{error}</p>}
            {!isLoading && !error && (
              <>
                {filteredDoctors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDoctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className="border rounded-lg p-4 shadow hover:shadow-lg transition-shadow duration-300 bg-white flex flex-col items-center text-center" // Centered content
                        data-testid="doctor-card"
                      >
                        <img
                          // Use doctor.photo and provide a robust fallback
                          src={doctor.photo || 'https://placehold.co/150x150/E0E0E0/BDBDBD?text=No+Image'}
                          alt={`Dr. ${doctor.name}`}
                          className="w-24 h-24 rounded-full mb-3 object-cover border border-gray-200" // Added border
                          // More specific placeholder on error
                          onError={(e) => (e.currentTarget.src = 'https://placehold.co/150x150/E0E0E0/BDBDBD?text=No+Image')}
                        />
                        <h3 className="text-lg font-semibold text-gray-800 mb-1" data-testid="doctor-name">
                           {/* Removed "Dr." prefix assuming it's in the name */}
                           {doctor.name}
                        </h3>
                        {/* Display first specialty, handle cases with no specialties */}
                        <p className="text-sm text-blue-700 mb-2" data-testid="doctor-specialty">
                          {doctor.specialities && doctor.specialities.length > 0
                            ? doctor.specialities[0].name
                            : 'N/A'}
                        </p>
                        <div className="text-sm text-gray-600 space-y-1 w-full">
                            <p data-testid="doctor-experience">
                              Experience: {doctor.experience || 'N/A'}
                            </p>
                            <p data-testid="doctor-fee">
                              Fees: {doctor.fees || 'N/A'}
                            </p>
                           
                             <div className="text-xs text-gray-500 pt-2 flex justify-center gap-2 flex-wrap">
                                  {doctor.video_consult && (
                                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Video Consult</span>
                                  )}
                                  {doctor.in_clinic && (
                                       <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">In Clinic</span>
                                  )}
                             </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 mt-10 py-10">No doctors found matching your criteria.</p>
                )}
              </>
            )}
          </main>
        </div>
      </div>
  );
}