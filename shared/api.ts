/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Destination type from resorts.destinations table
 */
export interface Destination {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  is_featured: boolean;
}

/**
 * Resort type from resorts_by_destination view
 */
export interface Resort {
  id: string;
  name: string;
  google_hotel_class: number | null;
  google_user_rating: number | null;
  google_num_reviews: number | null;
  location: string;
  country: string | null;
  formatted_description: string | null;
  num_standard_weeks: number;
  num_upgrade_weeks: number;
  image_url: string;
  destination_id: string;
  destination_slug: string;
  destination_name: string;
}

/**
 * Amenity or Activity item with icon
 */
export interface AmenityItem {
  icon: string | null;
  name: string;
  enhanced?: string;
}

/**
 * Full resort details from resort_details view
 */
export interface ResortDetails {
  id: string;
  resort_name: string;
  formatted_address: string;
  formatted_phone: string;
  formatted_description: string | null;
  formatted_amenities: AmenityItem[];
  formatted_activities: AmenityItem[];
  formatted_accessibility_notes: AmenityItem[];
  formatted_policies: string[];
  formatted_unit_info: string | null;
  formatted_mandatory_fees: AmenityItem[];
  formatted_other_fees: AmenityItem[];
  google_user_rating: number | null;
  google_num_reviews: number | null;
  google_hotel_class: number | null;
  precise_hotel_class: number | null;
  tripadvisor_user_rating: number | null;
  tripAdvisor_num_reviews: number | null;
  city: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}
