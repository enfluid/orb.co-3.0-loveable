import { useEffect, useState, useRef, useCallback } from "react";

// Robust parser for timestamptz strings from Postgres
function parseTimestamptz(input: unknown): number | null {
  if (!input) return null;
  if (input instanceof Date) return input.getTime();
  const s = String(input).replace(" ", "T");
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { CarouselDots } from "@/components/ui/carousel-dots";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverArrow,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Icon } from "@/components/Icon";
import { ResortDetails as ResortDetailsType, AmenityItem } from "@shared/api";
import { supabase } from "@/lib/supabase";
import { extractColorsFromImage } from "@/lib/colorUtils";
import { toast } from "@/hooks/use-toast";

interface GradientColors {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
}

interface AvailableDate {
  id: number;
  checkin_date: string;
  checkout_date: string;
  room_type: string;
  kitchen_type: string;
  max_occupancy: number;
  price: number;
  num_nights: number | null;
  base_nightly_taxes_and_fees: number;
  resort_id: string;
  online_mean_nightly_price: number | null;
}

interface BookingSlot {
  id: string;
  roomType: string;
  kitchenType: string;
  sleeps: number;
  dates: string;
  drawerDates: string;
  checkIn: string;
  checkOut: string;
  price: number;
  taxesFees: number;
  baseNightlyTaxesFees: number;
  upgradeFeesPerNight: number;
  totalNights: number;
  onlineMeanNightlyPrice: number | null;
}

interface ResortImage {
  url: string;
  notes: string | null;
}

export default function ResortDetails() {
  const { id } = useParams();
  const [resort, setResort] = useState<ResortDetailsType | null>(null);
  const [images, setImages] = useState<ResortImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradientColors, setGradientColors] = useState<GradientColors>({
    primary: "#0088cc",
    secondary: "#00d4ff",
    tertiary: "#66dd88",
    quaternary: "#88ff44",
  });
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [groupedBookings, setGroupedBookings] = useState<
    Record<string, BookingSlot[]>
  >({});
  const [lastScrapeMs, setLastScrapeMs] = useState<number | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(14);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const handleZoomIn = () => {
    if (mapRef.current) {
      setZoom((prev) => Math.min(prev + 1, 21));
      mapRef.current.setZoom(zoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      setZoom((prev) => Math.max(prev - 1, 0));
      mapRef.current.setZoom(zoom - 1);
    }
  };

  const [selectedBooking, setSelectedBooking] = useState<BookingSlot | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingSummaryOpen, setBookingSummaryOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [contactAccepted, setContactAccepted] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [lockAxis, setLockAxis] = useState<"none" | "x" | "y">("none");
  const lockAxisRef = useRef<"none" | "x" | "y">("none");
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [showOpenImageButton, setShowOpenImageButton] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [appearingIds, setAppearingIds] = useState<Set<string>>(new Set());
  const [disappearingIds, setDisappearingIds] = useState<Set<string>>(
    new Set(),
  );
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  const formatAddress = (addr?: string | null) => {
    if (!addr) return "";
    return addr.replace(
      /,?\s*(USA|United States|United States of America)$/i,
      "",
    );
  };
  const markerPath =
    "M12 2 C 6 2 2 6.8 2 12.5 C 2 21 12 31 12 31 C 12 31 22 21 22 12.5 C 22 6.8 18 2 12 2 Z M 12 8.5 C 14.209139 8.5 16 10.290861 16 12.5 C 16 14.709139 14.209139 16.5 12 16.5 C 9.790861 16.5 8 14.709139 8 12.5 C 8 10.290861 9.790861 8.5 12 8.5 Z";
  const markerSymbol = {
    path: markerPath,
    fillColor: "#0284c7",
    fillOpacity: 1,
    strokeOpacity: 0,
    scale: 1.2,
  } as google.maps.Symbol;

  const copyToClipboard = async (text: string, success: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast({ title: success });
    } catch (e) {
      toast({ title: "Copy failed", description: String(e) });
    }
  };

  const mapStyles = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
    { featureType: "poi.government", stylers: [{ visibility: "off" }] },
    { featureType: "poi.school", stylers: [{ visibility: "off" }] },
    { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
    { featureType: "poi.attraction", stylers: [{ visibility: "on" }] },
    { featureType: "poi.park", stylers: [{ visibility: "on" }] },
    { featureType: "poi.sports_complex", stylers: [{ visibility: "on" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    {
      featureType: "road",
      elementType: "labels.icon",
      stylers: [{ visibility: "off" }],
    },
  ] as const;

  // Progress bar for external refresh
  const [refreshActive, setRefreshActive] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [refreshOpacity, setRefreshOpacity] = useState(1);
  const refreshIntervalRef = useRef<number | null>(null);
  // Track last webhook call time to avoid over-calling and allow hourly re-trigger
  const refreshRequestedRef = useRef<boolean>(false);
  const lastRefreshRequestAtRef = useRef<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const handleBack = () => {
    const from = location.state?.from;
    if (from) {
      navigate(from);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/destinations");
    }
  };

  useEffect(() => {
    const fetchResortDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch resort details (directly from resorts.resorts)
        const { data: resortData, error: resortError } = await supabase
          .schema("resorts")
          .from("resorts")
          .select(
            [
              "id",
              "resort_name",
              "formatted_address",
              "formatted_phone",
              "formatted_description",
              "formatted_amenities",
              "formatted_activities",
              "formatted_accessibility_notes",
              "formatted_policies",
              "formatted_unit_info",
              "formatted_mandatory_fees",
              "formatted_other_fees",
              "google_user_rating",
              "google_num_reviews",
              "google_hotel_class",
              "precise_hotel_class",
              "tripadvisor_user_rating",
              "last_resort_details_scrape",
              "city",
              "country",
              "latitude",
              "longitude",
            ].join(","),
          )
          .eq("id", id)
          .single();

        if (resortError) throw resortError;
        if (!resortData) throw new Error("Resort not found");

        setResort(resortData as ResortDetailsType);
        setLastScrapeMs(
          parseTimestamptz((resortData as any).last_resort_details_scrape),
        );

        // Fetch all images for this resort
        const { data: imageData, error: imageError } = await supabase
          .schema("resorts")
          .from("resort_images")
          .select("processed_image_url, notes")
          .eq("resort_id", id)
          .not("processed_image_url", "is", null)
          .eq("active", true)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

        if (imageError) throw imageError;

        const resortImages = (imageData || [])
          .map((img: any) => ({
            url: img.processed_image_url,
            notes: img.notes || null,
          }))
          .filter((img): img is ResortImage => img.url !== null);

        setImages(
          resortImages.length > 0
            ? resortImages
            : [{ url: "/placeholder.svg", notes: null }],
        );

        // Extract colors from the first image for the gradient
        if (resortImages.length > 0) {
          try {
            const colors = await extractColorsFromImage(resortImages[0].url);
            setGradientColors(colors);
          } catch (colorError) {
            console.error("Failed to extract colors from image:", colorError);
            // Continue with default colors if extraction fails
          }
        }

        // Fetch available dates for this resort
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        const { data: datesData, error: datesError } = await supabase
          .schema("resorts")
          .from("available_dates")
          .select("*")
          .eq("resort_id", id)
          .gt("checkin_date", tomorrowStr)
          .is("disappeared_at", null)
          .order("checkin_date", { ascending: true });

        if (datesError) throw datesError;

        let dates = (datesData || []) as AvailableDate[];

        // Build unique combinations that are missing online_mean_nightly_price
        const comboKey = (
          d: Pick<
            AvailableDate,
            "room_type" | "kitchen_type" | "max_occupancy"
          >,
        ) => `${d.room_type}__${d.kitchen_type}__${d.max_occupancy}`;

        const combosToFetch = new Map<
          string,
          { room_type: string; kitchen_type: string; max_occupancy: number }
        >();
        for (const d of dates) {
          if (
            d.online_mean_nightly_price === null ||
            typeof d.online_mean_nightly_price === "undefined"
          ) {
            const key = comboKey(d);
            if (!combosToFetch.has(key)) {
              combosToFetch.set(key, {
                room_type: d.room_type,
                kitchen_type: d.kitchen_type,
                max_occupancy: d.max_occupancy,
              });
            }
          }
        }

        // Fetch means once per combination (most recent 20 with non-null online_mean_nightly_price)
        const means = new Map<string, number>();
        if (combosToFetch.size > 0) {
          const results = await Promise.all(
            Array.from(combosToFetch.values()).map(async (c) => {
              const { data, error } = await supabase
                .schema("resorts")
                .from("available_dates")
                .select("online_mean_nightly_price,checkin_date")
                .eq("resort_id", id)
                .eq("room_type", c.room_type)
                .eq("kitchen_type", c.kitchen_type)
                .eq("max_occupancy", c.max_occupancy)
                .not("online_mean_nightly_price", "is", null)
                .order("checkin_date", { ascending: false })
                .limit(20);

              if (error || !data || data.length === 0) {
                return [comboKey(c), undefined] as const;
              }

              const values = data
                .map(
                  (row: { online_mean_nightly_price: number | null }) =>
                    row.online_mean_nightly_price,
                )
                .filter((v): v is number => typeof v === "number");
              const mean =
                values.length > 0
                  ? values.reduce((a, b) => a + b, 0) / values.length
                  : undefined;
              return [comboKey(c), mean] as const;
            }),
          );

          for (const [key, mean] of results) {
            if (typeof mean === "number" && !Number.isNaN(mean)) {
              means.set(key, mean);
            }
          }
        }

        // Fill missing values in-memory using the computed means
        dates = dates.map((d) => {
          if (
            d.online_mean_nightly_price === null ||
            typeof d.online_mean_nightly_price === "undefined"
          ) {
            const mean = means.get(comboKey(d));
            if (typeof mean === "number" && !Number.isNaN(mean)) {
              return { ...d, online_mean_nightly_price: mean };
            }
          }
          return d;
        });

        setAvailableDates(dates);

        // Group by travel date (checkin_date and checkout_date)
        const grouped = groupByTravelDate(dates);
        setGroupedBookings(grouped);
      } catch (err) {
        let message = "Failed to fetch resort details";

        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === "object" && err !== null) {
          // Handle Supabase errors or other structured error objects
          const errorObj = err as Record<string, unknown>;

          // Try multiple error properties in order of likelihood
          if (errorObj.message && typeof errorObj.message === "string") {
            message = errorObj.message;
          } else if (
            errorObj.error_description &&
            typeof errorObj.error_description === "string"
          ) {
            message = errorObj.error_description;
          } else if (errorObj.details && typeof errorObj.details === "string") {
            message = errorObj.details;
          } else if (errorObj.hint && typeof errorObj.hint === "string") {
            message = errorObj.hint;
          } else if (errorObj.msg && typeof errorObj.msg === "string") {
            message = errorObj.msg;
          } else if (errorObj.code && typeof errorObj.code === "string") {
            message = `Error (${errorObj.code})`;
          } else if (errorObj.status && typeof errorObj.status === "number") {
            message = `HTTP Error ${errorObj.status}`;
          } else {
            // Last resort: try to find any string property
            const stringProps = Object.values(errorObj).find(
              (val): val is string => typeof val === "string" && val.length > 0,
            );
            if (stringProps) {
              message = stringProps;
            } else {
              try {
                const stringified = JSON.stringify(errorObj);
                if (
                  stringified &&
                  stringified !== "{}" &&
                  stringified !== "[object Object]"
                ) {
                  message = stringified;
                } else {
                  message = "Unknown error occurred";
                }
              } catch {
                message = "Unknown error occurred";
              }
            }
          }
        } else {
          message = String(err);
        }

        setError(message);
        console.error("Error fetching resort details:", {
          error: err,
          message: message,
          type: typeof err,
          isError: err instanceof Error,
          keys:
            typeof err === "object" && err !== null
              ? Object.keys(err as object)
              : [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchResortDetails();
    }
  }, [id]);

  // External refresh webhook: only trigger if last scrape > 1 hour ago
  const triggerRefresh = useCallback(() => {
    if (!id || refreshActive) return;
    const oneHour = 60 * 60 * 1000;
    const lastReqAt = lastRefreshRequestAtRef.current;
    const sinceReq = lastReqAt ? Date.now() - lastReqAt : Infinity;
    const sinceScrape = lastScrapeMs ? Date.now() - lastScrapeMs : Infinity;
    // Only trigger if it's been >= 1h since our last request AND last scrape is stale (>=1h) or null
    if (!(sinceReq >= oneHour && sinceScrape >= oneHour)) return;
    refreshRequestedRef.current = true;
    lastRefreshRequestAtRef.current = Date.now();

    setRefreshActive(true);
    setRefreshProgress(0);
    setRefreshOpacity(1);

    const start = Date.now();
    if (refreshIntervalRef.current)
      window.clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = window.setInterval(() => {
      setRefreshProgress((prev) => {
        const elapsed = Date.now() - start;
        const expected = 5000;
        const target = 88;
        const proportion = Math.min(elapsed / expected, 0.99);
        const next = Math.max(prev, Math.floor(proportion * target));
        return Math.min(target, next);
      });
    }, 120);

    try {
      const url = `https://n8n.orb.co/webhook/reresh-resort-details-and-dates?resort-id=${encodeURIComponent(id)}`;
      if (navigator.sendBeacon) {
        const data = new Blob([], { type: "application/octet-stream" });
        navigator.sendBeacon(url, data);
      } else {
        const img = new Image();
        img.src = `${url}&_=${Date.now()}`;
      }
    } catch (_) {
      // ignore
    } finally {
      if (refreshIntervalRef.current) {
        window.clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      setRefreshProgress(100);
      setTimeout(() => {
        setRefreshOpacity(0);
        setTimeout(() => {
          setRefreshActive(false);
          setRefreshProgress(0);
          setRefreshOpacity(1);
        }, 400);
      }, 200);
    }
  }, [id, refreshActive]);

  useEffect(() => {
    if (!id || isLoading) return;
    const oneHour = 60 * 60 * 1000;
    const lastReqAt = lastRefreshRequestAtRef.current;
    const sinceReq = lastReqAt ? Date.now() - lastReqAt : Infinity;
    const sinceScrape = lastScrapeMs ? Date.now() - lastScrapeMs : Infinity;
    if (sinceReq >= oneHour && sinceScrape >= oneHour) {
      triggerRefresh();
    }
  }, [id, isLoading, lastScrapeMs, triggerRefresh]);

  useEffect(() => {
    const onFocusOrVisible = () => {
      if (document.visibilityState !== "visible") return;
      const oneHour = 60 * 60 * 1000;
      const lastReqAt = lastRefreshRequestAtRef.current;
      const sinceReq = lastReqAt ? Date.now() - lastReqAt : Infinity;
      const sinceScrape = lastScrapeMs ? Date.now() - lastScrapeMs : Infinity;
      if (sinceReq >= oneHour && sinceScrape >= oneHour) {
        triggerRefresh();
      }
    };
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    return () => {
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [lastScrapeMs, refreshActive, triggerRefresh]);

  // Reset gating when resort changes
  useEffect(() => {
    refreshRequestedRef.current = false;
    lastRefreshRequestAtRef.current = null;
  }, [id]);

  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        window.clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  const groupByTravelDate = (
    dates: AvailableDate[],
  ): Record<string, BookingSlot[]> => {
    const grouped: Record<string, BookingSlot[]> = {};

    dates.forEach((date) => {
      const key = `${date.checkin_date}-${date.checkout_date}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      // Parse dates as local dates (not UTC) to avoid timezone shifts
      if (!date.checkin_date || !date.checkout_date) {
        return;
      }

      const [checkInYear, checkInMonth, checkInDay] = date.checkin_date
        .split("-")
        .map(Number);
      const [checkOutYear, checkOutMonth, checkOutDay] = date.checkout_date
        .split("-")
        .map(Number);

      const checkInDate = new Date(checkInYear, checkInMonth - 1, checkInDay);
      const checkOutDate = new Date(
        checkOutYear,
        checkOutMonth - 1,
        checkOutDay,
      );

      // Use num_nights from database if available, otherwise calculate
      let totalNights = date.num_nights || 0;
      if (!totalNights || totalNights <= 0) {
        totalNights = Math.floor(
          (checkOutDate.getTime() - checkInDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
      }

      // Ensure totalNights is a valid positive number
      if (!totalNights || totalNights <= 0) {
        return;
      }

      const checkInDayStr = checkInDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const checkOutDayStr = checkOutDate.toLocaleDateString("en-US", {
        weekday: "long",
      });

      const nightlyPrice = date.price / (date.num_nights || 1);
      const baseNightlyTaxesFees = date.base_nightly_taxes_and_fees;

      let displayTaxesFees = nightlyPrice;
      let upgradeFee = 0;

      if (nightlyPrice > baseNightlyTaxesFees + 1) {
        displayTaxesFees = baseNightlyTaxesFees;
        upgradeFee = nightlyPrice - baseNightlyTaxesFees;
      }

      const slot: BookingSlot = {
        id: String(date.id),
        roomType: date.room_type,
        kitchenType: date.kitchen_type,
        sleeps: date.max_occupancy,
        dates: `${checkInDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${checkOutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${checkInDayStr} to ${checkOutDayStr})`,
        drawerDates: `${totalNights} Nights • ${checkInDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} to ${checkOutDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`,
        checkIn: date.checkin_date,
        checkOut: date.checkout_date,
        price: date.price,
        taxesFees: Math.round(displayTaxesFees * 100) / 100,
        baseNightlyTaxesFees: Math.round(baseNightlyTaxesFees * 100) / 100,
        upgradeFeesPerNight: Math.round(upgradeFee * 100) / 100,
        totalNights,
        onlineMeanNightlyPrice: date.online_mean_nightly_price,
      };

      grouped[key].push(slot);
    });

    return grouped;
  };

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`realtime-available-dates-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "resorts",
          table: "available_dates",
          filter: `resort_id=eq.${id}`,
        },
        (payload) => {
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split("T")[0];

          const isRowVisible = (row: any) => {
            if (!row) return false;
            const isFuture = row.checkin_date > tomorrowStr;
            const notDisappeared =
              row.disappeared_at === null ||
              typeof row.disappeared_at === "undefined";
            return (
              isFuture && notDisappeared && String(row.resort_id) === String(id)
            );
          };

          const rowId = String((payload as any).new?.id);
          const row = (payload as any).new as any;
          if (!isRowVisible(row)) return;
          setAvailableDates((prev) => {
            const exists = prev.some((d) => String(d.id) === rowId);
            const next = exists
              ? prev.map((d) =>
                  String(d.id) === rowId
                    ? { ...(d as any), ...(row as any) }
                    : d,
                )
              : [...prev, row as any];
            setGroupedBookings(groupByTravelDate(next));
            return next;
          });
          setAppearingIds((prev) => {
            const s = new Set(prev);
            s.add(rowId);
            return s;
          });
          setTimeout(() => {
            setAppearingIds((prev) => {
              const s = new Set(prev);
              s.delete(rowId);
              return s;
            });
          }, 1200);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "resorts",
          table: "available_dates",
          filter: `resort_id=eq.${id}`,
        },
        (payload) => {
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split("T")[0];

          const isRowVisible = (row: any) => {
            if (!row) return false;
            const isFuture = row.checkin_date > tomorrowStr;
            const notDisappeared =
              row.disappeared_at === null ||
              typeof row.disappeared_at === "undefined";
            return (
              isFuture && notDisappeared && String(row.resort_id) === String(id)
            );
          };

          const rowId = String((payload as any).new?.id);
          const row = (payload as any).new as any;
          const shouldShow = isRowVisible(row);
          if (shouldShow) {
            setAvailableDates((prev) => {
              const exists = prev.some((d) => String(d.id) === rowId);
              const next = exists
                ? prev.map((d) =>
                    String(d.id) === rowId
                      ? { ...(d as any), ...(row as any) }
                      : d,
                  )
                : [...prev, row as any];
              setGroupedBookings(groupByTravelDate(next));
              if (!exists) {
                setAppearingIds((prev2) => {
                  const s = new Set(prev2);
                  s.add(rowId);
                  return s;
                });
                setTimeout(() => {
                  setAppearingIds((prev2) => {
                    const s = new Set(prev2);
                    s.delete(rowId);
                    return s;
                  });
                }, 1200);
              }
              return next;
            });
          } else {
            setDisappearingIds((prev) => {
              const s = new Set(prev);
              s.add(rowId);
              return s;
            });
            setTimeout(() => {
              setAvailableDates((prev) => {
                const next = prev.filter((d) => String(d.id) !== rowId);
                setGroupedBookings(groupByTravelDate(next));
                return next;
              });
              setDisappearingIds((prev) => {
                const s = new Set(prev);
                s.delete(rowId);
                return s;
              });
            }, 220);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "resorts", table: "available_dates" },
        (payload) => {
          const rowId = String((payload as any).old?.id);
          // Only act if we actually have this row in local state
          const existsLocally = availableDates.some(
            (d) => String(d.id) === rowId,
          );
          if (!existsLocally) return;

          setDisappearingIds((prev) => {
            const s = new Set(prev);
            s.add(rowId);
            return s;
          });
          setTimeout(() => {
            setAvailableDates((prev) => {
              const next = prev.filter((d) => String(d.id) !== rowId);
              setGroupedBookings(groupByTravelDate(next));
              return next;
            });
            setDisappearingIds((prev) => {
              const s = new Set(prev);
              s.delete(rowId);
              return s;
            });
          }, 220);
        },
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase.channel(`realtime-resorts-${id}`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "resorts",
        table: "resorts",
        filter: `id=eq.${id}`,
      },
      async () => {
        try {
          const { data: resortData, error: resortError } = await supabase
            .schema("resorts")
            .from("resorts")
            .select(
              [
                "id",
                "resort_name",
                "formatted_address",
                "formatted_phone",
                "formatted_description",
                "formatted_amenities",
                "formatted_activities",
                "formatted_accessibility_notes",
                "formatted_policies",
                "formatted_unit_info",
                "formatted_mandatory_fees",
                "formatted_other_fees",
                "google_user_rating",
                "google_num_reviews",
                "google_hotel_class",
                "precise_hotel_class",
                "tripadvisor_user_rating",
                "last_resort_details_scrape",
                "city",
                "country",
                "latitude",
                "longitude",
              ].join(","),
            )
            .eq("id", id)
            .single();
          if (resortError) throw resortError;
          if (resortData) {
            setResort(resortData as ResortDetailsType);
            setLastScrapeMs(
              parseTimestamptz((resortData as any).last_resort_details_scrape),
            );
          }
        } catch (e) {
          console.error("Failed to refresh resort after update", e);
        }
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (
      selectedBooking &&
      !availableDates.some((d) => String(d.id) === selectedBooking.id)
    ) {
      setSelectedBooking(null);
    }
  }, [availableDates, selectedBooking]);

  const renderAmenityItem = (item: AmenityItem) => {
    return (
      <div key={item.name} className="flex items-center gap-2">
        {item.icon ? (
          <Icon name={item.icon} size={16} className="flex-shrink-0" />
        ) : (
          <div className="w-4 h-4 flex-shrink-0" />
        )}
        <span className="text-sm text-gray-700">{item.name}</span>
      </div>
    );
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const calculateTotal = (booking: BookingSlot) => {
    return (
      (booking.taxesFees + booking.upgradeFeesPerNight) * booking.totalNights
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const computeTotalMandatoryFees = (
    slot: BookingSlot,
    resort: ResortDetailsType | null,
  ): number => {
    if (!resort || !resort.formatted_mandatory_fees) return 0;

    let totalMandatoryFees = 0;

    if (resort.formatted_mandatory_fees.length > 0) {
      for (const fee of resort.formatted_mandatory_fees) {
        if (fee.currency !== "USD") continue;

        const unitType = fee.unit_type?.toLowerCase();
        const roomTypeMapping: Record<string, string> = {
          "1 bedroom": "1 bedroom",
          "2 bedroom": "2 bedroom",
          "3 bedroom": "3 bedroom",
          hotel: "hotel",
          studio: "studio",
        };

        const slotRoomTypeLower = slot.roomType.toLowerCase();
        const feeApplies =
          unitType === "all" || roomTypeMapping[slotRoomTypeLower] === unitType;

        if (!feeApplies) continue;

        const feeAmount = fee.fee_amount || 0;
        if (fee.interval === "per_night") {
          totalMandatoryFees += feeAmount * slot.totalNights;
        } else if (fee.interval === "per_stay") {
          totalMandatoryFees += feeAmount;
        }
      }
    }

    return totalMandatoryFees;
  };

  const calculateSavings = (
    slot: BookingSlot,
    resort: ResortDetailsType,
  ): number | string => {
    if (!slot.onlineMeanNightlyPrice) {
      return 0;
    }

    const totalMandatoryFees = computeTotalMandatoryFees(slot, resort);

    const costForStay = slot.price + totalMandatoryFees;
    const onlinePriceForStay = slot.onlineMeanNightlyPrice * slot.totalNights;
    const savings = onlinePriceForStay - costForStay;

    return Math.max(0, savings);
  };

  useEffect(() => {
    const measure = () => {
      if (carouselRef.current)
        setCarouselWidth(carouselRef.current.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    lockAxisRef.current = lockAxis;
  }, [lockAxis]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const onNativeTouchStart = (evt: TouchEvent) => {
      const t = evt.touches[0];
      touchStartXRef.current = t.clientX;
      touchStartYRef.current = t.clientY;
      lockAxisRef.current = "none";
    };

    const onNativeTouchMove = (evt: TouchEvent) => {
      const t = evt.touches[0];
      const sx = touchStartXRef.current;
      const sy = touchStartYRef.current;
      if (sx != null && sy != null) {
        const dx = t.clientX - sx;
        const dy = t.clientY - sy;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (lockAxisRef.current === "none") {
          // Early axis decision with tiny threshold and angle bias
          const small = 3;
          if (adx > small || ady > small) {
            lockAxisRef.current = adx >= ady * 1.1 ? "x" : "y";
          }
        }
      }
      if (lockAxisRef.current === "x" && evt.cancelable) {
        evt.preventDefault();
      }
    };

    el.addEventListener("touchstart", onNativeTouchStart, { passive: true });
    el.addEventListener("touchmove", onNativeTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onNativeTouchStart as EventListener);
      el.removeEventListener("touchmove", onNativeTouchMove as EventListener);
    };
  }, [carouselRef.current]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const x = e.targetTouches[0].clientX;
    const y = e.targetTouches[0].clientY;
    setTouchStart(x);
    setTouchStartX(x);
    setTouchStartY(y);
    setIsDragging(true);
    setLockAxis("none");
    setDragX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStartX === null || touchStartY === null) return;
    const x = e.targetTouches[0].clientX;
    const y = e.targetTouches[0].clientY;
    const dx = x - touchStartX;
    const dy = y - touchStartY;

    if (lockAxis === "none") {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const small = 3;
      if (adx > small || ady > small) {
        const axis = adx >= ady * 1.1 ? "x" : "y";
        lockAxisRef.current = axis;
        setLockAxis(axis);
      }
    }

    if (lockAxisRef.current === "x") {
      // Ensure this synthetic handler also cancels default if possible
      if ((e as any).cancelable) e.preventDefault();
      setDragX(dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const endX = e.changedTouches[0].clientX;
    const delta = endX - touchStartX;
    const threshold = 50;

    if (delta <= -threshold && currentImageIndex < images.length - 1) {
      setCurrentImageIndex((i) => i + 1);
    } else if (delta >= threshold && currentImageIndex > 0) {
      setCurrentImageIndex((i) => i - 1);
    }

    setIsDragging(false);
    setDragX(0);
    setTouchStartX(null);
    setTouchStartY(null);
    setLockAxis("none");
  };

  // Swipe animation handled directly in touch handlers above

  useEffect(() => {
    if (!lightboxOpen) {
      setShowOpenImageButton(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+1 (Mac) or Ctrl+1 (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        setShowOpenImageButton((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen]);

  // Scroll selected slot into view when drawer opens
  useEffect(() => {
    if (selectedBooking) {
      setTimeout(() => {
        const slotElement = document.querySelector(
          `[data-slot-id="${selectedBooking.id}"]`,
        );
        if (slotElement) {
          const rect = slotElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          // Estimate drawer height (approximately 40-50% of viewport on mobile)
          const drawerEstimatedHeight = viewportHeight * 0.5;
          const scrollMargin = 10;

          // If the element would be covered by the drawer, scroll it up
          if (rect.bottom > viewportHeight - drawerEstimatedHeight) {
            const scrollDistance =
              rect.bottom -
              (viewportHeight - drawerEstimatedHeight - scrollMargin);
            window.scrollBy({
              top: scrollDistance,
              behavior: "smooth",
            });
          }
        }
      }, 100);
    }
  }, [selectedBooking]);

  // Compute min/max nightly taxes & fees across available dates
  const allSlots = Object.values(groupedBookings).flat();
  const taxesValues = allSlots
    .map((s) => s.taxesFees)
    .filter((v) => typeof v === "number" && Number.isFinite(v));
  const minTaxes = taxesValues.length ? Math.min(...taxesValues) : null;
  const maxTaxes = taxesValues.length ? Math.max(...taxesValues) : null;
  const nf0 = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  const minTaxesStr =
    minTaxes != null ? nf0.format(Math.round(minTaxes)) : null;
  const maxTaxesStr =
    maxTaxes != null ? nf0.format(Math.round(maxTaxes)) : null;

  // Compute the lowest upgrade fee per night across available slots (if any)
  const upgradeValues = allSlots
    .map((s) => s.upgradeFeesPerNight)
    .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
  const minUpgrade = upgradeValues.length ? Math.min(...upgradeValues) : null;
  const minUpgradeStr =
    minUpgrade != null ? nf0.format(Math.round(minUpgrade)) : null;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Icon
            name="circle-exclamation"
            size={48}
            color="text-red-600"
            className="mx-auto mb-4"
          />
          <p className="text-red-600 font-semibold">
            Error loading resort details
          </p>
          <p className="text-gray-600 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !resort) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading resort details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Photo Gallery - Full Width at Top */}
      <div className="w-full">
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-2" style={{ gap: "5px" }}>
          {/* Large Image */}
          <div
            className="aspect-[5/4] overflow-hidden cursor-pointer"
            onClick={() => openLightbox(0)}
          >
            <img
              src={images[0]?.url}
              alt={resort.resort_name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
          {/* Thumbnails Grid */}
          <div className="grid grid-cols-2" style={{ gap: "5px" }}>
            {images.slice(1, 5).map(({ url }, index) => (
              <div
                key={index}
                className="aspect-[5/4] overflow-hidden cursor-pointer relative"
                onClick={() => openLightbox(index + 1)}
              >
                <img
                  src={url}
                  alt={`${resort.resort_name} ${index + 2}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                {index === 3 && images.length > 5 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-white flex items-center gap-2">
                      <Icon name="images" size={32} color="text-white" />
                      <span className="text-3xl font-medium">
                        {images.length - 5}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Layout - Swipeable Carousel */}
        <div
          className="md:hidden relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Image Container */}
          <div
            className="aspect-[5/4] overflow-hidden relative"
            ref={carouselRef}
          >
            <div
              className="flex h-full w-full"
              style={{
                transform: `translateX(calc(-${currentImageIndex * 100}% + ${dragX}px))`,
                transition: isDragging ? "none" : "transform 300ms ease",
              }}
            >
              {images.map(({ url }, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${resort.resort_name} ${i + 1}`}
                  className="w-full h-full object-cover flex-shrink-0 basis-full"
                />
              ))}
            </div>
            {/* Image Counter Overlay */}
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
              {currentImageIndex + 1} of {images.length}
            </div>
          </div>

          {/* Mobile progress bar above dots (space reserved) */}
          <div className="w-full h-0.5 bg-transparent md:hidden">
            <div
              className="h-full bg-sky-600"
              style={{
                width: refreshActive ? `${refreshProgress}%` : "0%",
                opacity: refreshActive ? refreshOpacity : 0,
                transition: "width 200ms linear, opacity 300ms ease",
              }}
            />
          </div>
          {/* Dot Indicators */}
          <CarouselDots
            totalItems={images.length}
            currentIndex={currentImageIndex}
            onDotClick={setCurrentImageIndex}
            floatIndex={
              carouselWidth > 0
                ? currentImageIndex - dragX / carouselWidth
                : currentImageIndex
            }
            isDragging={isDragging}
          />
        </div>
      </div>

      {/* Thin blue progress bar under images (desktop) - space reserved */}
      <div className="w-full h-0.5 bg-transparent hidden md:block">
        <div
          className="h-full bg-sky-600"
          style={{
            width: refreshActive ? `${refreshProgress}%` : "0%",
            opacity: refreshActive ? refreshOpacity : 0,
            transition: "width 200ms linear, opacity 300ms ease",
          }}
        />
      </div>

      <div className="container mx-auto px-5 md:px-8 py-4 md:py-8">
        {/* Resort Header */}
        <div className="mb-6">
          <div className="space-y-3">
            {/* Back Link */}
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-2"
            >
              <Icon name="arrow-left" size={16} />
              <span className="text-sm font-medium">Back to Resorts</span>
            </button>

            {/* Title */}
            <h1
              className="text-4xl md:text-6xl font-bold break-words"
              style={{
                background: `linear-gradient(135deg, ${gradientColors.primary} 0%, ${gradientColors.secondary} 25%, ${gradientColors.tertiary} 75%, ${gradientColors.quaternary} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                lineHeight: "1.3",
                paddingBottom: "0.25em",
              }}
            >
              {resort.resort_name}
            </h1>

            {/* Info + Map grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left: ratings + description */}
              <div className="lg:col-span-8 space-y-4">
                <div className="w-full rounded-2xl px-4 py-3 md:px-6 md:py-4 bg-gradient-to-b from-white to-gray-100 border border-gray-200 shadow uppercase">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    {/* Guest Rating */}
                    {(resort.google_user_rating ||
                      resort.tripadvisor_user_rating) &&
                      (() => {
                        const googleRating = resort.google_user_rating || 0;
                        const tripadvisorRating =
                          resort.tripadvisor_user_rating || 0;
                        const useGoogle =
                          googleRating >= tripadvisorRating && googleRating > 0;
                        const rating = useGoogle
                          ? googleRating
                          : tripadvisorRating;
                        const reviewCount = useGoogle
                          ? resort.google_num_reviews
                          : resort.tripAdvisor_num_reviews;
                        const source = useGoogle ? "Google" : "Tripadvisor";

                        return (
                          <div className="flex items-center gap-5 flex-1 min-w-0">
                            <Icon
                              name="star"
                              size={48}
                              className="flex-shrink-0 mt-0.5 md:mt-1"
                              color="text-sky-600"
                              maskScale={0.9}
                            />
                            <div className="text-gray-800 font-semibold text-lg md:text-xl leading-tight">
                              <span className="block">
                                {rating.toFixed(1)}-Star Guest Rating
                              </span>
                              {reviewCount ? (
                                <span className="block text-gray-600 text-base font-normal">
                                  {reviewCount.toLocaleString()} {source}{" "}
                                  Reviews
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })()}

                    {(resort.google_user_rating ||
                      resort.tripadvisor_user_rating) &&
                      (resort.google_hotel_class ||
                        resort.precise_hotel_class) && (
                        <>
                          <div
                            className="sm:hidden w-full h-px bg-gray-200 opacity-70 my-0"
                            aria-hidden="true"
                          />
                          <div
                            className="hidden sm:block h-8 w-px bg-gray-200"
                            aria-hidden="true"
                          />
                        </>
                      )}

                    {/* Hotel Class */}
                    {(resort.google_hotel_class ||
                      resort.precise_hotel_class) && (
                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        <Icon
                          name="apartment"
                          size={46}
                          className="flex-shrink-0 mt-0.5 md:mt-1"
                          color="text-sky-600"
                          maskScale={0.9}
                        />
                        <div className="text-gray-800 font-semibold text-lg md:text-xl leading-tight">
                          <span className="block">
                            {Math.max(
                              resort.google_hotel_class || 0,
                              resort.precise_hotel_class || 0,
                            )}
                            -Star Resort
                          </span>
                          <span className="block text-gray-600 text-base font-normal">
                            By industry standards
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {resort.formatted_description && (
                    <p className="text-gray-700 leading-relaxed text-justify">
                      {resort.formatted_description}
                    </p>
                  )}
                  {resort.formatted_unit_info && (
                    <p className="text-gray-700 leading-relaxed text-justify">
                      {resort.formatted_unit_info}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: map tile with address + phone */}
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                  <div
                    className="h-56 relative cursor-pointer"
                    onClick={() => setMapDialogOpen(true)}
                  >
                    <button
                      type="button"
                      aria-label="Open large map"
                      className="absolute inset-0 z-10"
                      onClick={() => setMapDialogOpen(true)}
                    />
                    {resort.latitude && resort.longitude && isLoaded ? (
                      <GoogleMap
                        zoom={14}
                        center={{ lat: resort.latitude, lng: resort.longitude }}
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        options={{
                          disableDefaultUI: true,
                          gestureHandling: "none",
                          clickableIcons: false,
                          draggable: false,
                          keyboardShortcuts: false,
                          scrollwheel: false,
                          disableDoubleClickZoom: true,
                          styles: mapStyles as any,
                        }}
                      >
                        <Marker
                          position={{
                            lat: resort.latitude,
                            lng: resort.longitude,
                          }}
                          title={resort.resort_name}
                          icon={markerSymbol}
                        />
                      </GoogleMap>
                    ) : (
                      <div className="h-full bg-gray-200 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Icon
                            name="location-dot"
                            size={32}
                            color="text-gray-500"
                            className="mx-auto mb-1"
                          />
                          <p className="text-xs">Map data not available</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    {resort.formatted_address && (
                      <div className="text-gray-900 text-sm flex items-start justify-between gap-3">
                        <a
                          className="flex items-start gap-2 hover:underline"
                          href={(function () {
                            const addr =
                              resort.formatted_address ||
                              resort.resort_name ||
                              "";
                            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                              return `http://maps.apple.com/?q=${encodeURIComponent(addr)}`;
                            }
                            if (/Android/.test(navigator.userAgent)) {
                              return `geo:0,0?q=${encodeURIComponent(addr)}`;
                            }
                            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
                          })()}
                        >
                          <Icon
                            name="location-dot"
                            size={16}
                            className="mt-0.5"
                          />
                          <span>{formatAddress(resort.formatted_address)}</span>
                        </a>
                        <button
                          type="button"
                          aria-label="Copy address"
                          className="p-1 rounded-md hover:bg-gray-50"
                          onClick={() => {
                            const text =
                              resort.formatted_address ||
                              resort.resort_name ||
                              "";
                            copyToClipboard(text, "Address copied");
                          }}
                        >
                          <Icon
                            name="copy"
                            style="regular"
                            color="text-gray-500"
                            size={16}
                          />
                        </button>
                      </div>
                    )}
                    {resort.formatted_phone && (
                      <div className="text-gray-900 text-sm mt-2 flex items-start justify-between gap-3">
                        <a
                          className="flex items-start gap-2 hover:underline"
                          href={`tel:${(resort.formatted_phone || "").replace(/[^\d+]/g, "")}`}
                        >
                          <Icon name="phone" size={16} className="mt-0.5" />
                          <span>{resort.formatted_phone}</span>
                        </a>
                        <button
                          type="button"
                          aria-label="Copy phone"
                          className="p-1 rounded-md hover:bg-gray-50"
                          onClick={() => {
                            const text = resort.formatted_phone || "";
                            copyToClipboard(text, "Phone copied");
                          }}
                        >
                          <Icon
                            name="copy"
                            style="regular"
                            color="text-gray-500"
                            size={16}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Amenities and Activities under header/map */}
        {resort.formatted_amenities &&
          resort.formatted_amenities.length > 0 && (
            <section className="mt-10">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-0 italic relative z-10 pl-5 md:pl-4"
                style={{ marginBottom: "-1rem" }}
              >
                Resort Amenities
              </h2>
              <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-100 rounded-2xl border border-gray-200 shadow px-5 md:px-4 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                  {resort.formatted_amenities.map((amenity, index) => (
                    <div key={index}>{renderAmenityItem(amenity)}</div>
                  ))}
                </div>
              </div>
            </section>
          )}

        {resort.formatted_activities &&
          resort.formatted_activities.length > 0 && (
            <section className="mt-10">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-0 italic relative z-10 pl-5 md:pl-4"
                style={{ marginBottom: "-1rem" }}
              >
                Activities
              </h2>
              <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-100 rounded-2xl border border-gray-200 shadow px-5 md:px-4 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                  {resort.formatted_activities.map((activity, index) => (
                    <div key={index}>{renderAmenityItem(activity)}</div>
                  ))}
                </div>
              </div>
            </section>
          )}

        {/* Large interactive map dialog */}
        <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
          <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden">
            <DialogHeader>
              <VisuallyHidden>
                <DialogTitle>Map for {resort.resort_name}</DialogTitle>
              </VisuallyHidden>
            </DialogHeader>
            <div className="h-[70vh] w-full">
              {isLoaded && resort.latitude && resort.longitude ? (
                <GoogleMap
                  zoom={zoom}
                  center={{ lat: resort.latitude, lng: resort.longitude }}
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  options={{
                    clickableIcons: false,
                    styles: mapStyles as any,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                  }}
                  onLoad={(m) => {
                    mapRef.current = m;
                  }}
                  onZoomChanged={() => {
                    if (mapRef.current) {
                      const z = mapRef.current.getZoom();
                      if (typeof z === "number") setZoom(z);
                    }
                  }}
                >
                  <Marker
                    position={{ lat: resort.latitude, lng: resort.longitude }}
                    title={resort.resort_name}
                    icon={markerSymbol}
                  />
                </GoogleMap>
              ) : (
                <div className="h-full bg-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Icon
                      name="location-dot"
                      size={40}
                      color="text-gray-500"
                      className="mx-auto mb-2"
                    />
                    <p className="text-sm">Map data not available</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t flex flex-wrap items-center gap-4 justify-between">
              <div className="text-sm text-gray-700 flex flex-wrap items-center gap-4 pr-2">
                {resort.formatted_address && (
                  <div className="inline-flex items-center gap-2">
                    <a
                      className="inline-flex items-center gap-1 hover:underline"
                      href={(function () {
                        const addr =
                          resort.formatted_address || resort.resort_name || "";
                        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                          return `http://maps.apple.com/?q=${encodeURIComponent(addr)}`;
                        }
                        if (/Android/.test(navigator.userAgent)) {
                          return `geo:0,0?q=${encodeURIComponent(addr)}`;
                        }
                        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
                      })()}
                    >
                      <Icon name="location-dot" size={14} className="mt-0.5" />
                      {formatAddress(resort.formatted_address)}
                    </a>
                    <button
                      type="button"
                      aria-label="Copy address"
                      className="p-1 rounded-md hover:bg-gray-50"
                      onClick={() => {
                        const text =
                          resort.formatted_address || resort.resort_name || "";
                        copyToClipboard(text, "Address copied");
                      }}
                    >
                      <Icon
                        name="copy"
                        style="regular"
                        color="text-gray-500"
                        size={16}
                      />
                    </button>
                  </div>
                )}

                {resort.formatted_phone && (
                  <div className="inline-flex items-center gap-2">
                    <a
                      className="inline-flex items-center gap-1 hover:underline"
                      href={`tel:${(resort.formatted_phone || "").replace(/[^\d+]/g, "")}`}
                    >
                      <Icon name="phone" size={14} className="mt-0.5" />
                      {resort.formatted_phone}
                    </a>
                    <button
                      type="button"
                      aria-label="Copy phone"
                      className="p-1 rounded-md hover:bg-gray-50"
                      onClick={() => {
                        const text = resort.formatted_phone || "";
                        copyToClipboard(text, "Phone copied");
                      }}
                    >
                      <Icon
                        name="copy"
                        style="regular"
                        color="text-gray-500"
                        size={16}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Resort Policies */}
            {resort.formatted_policies &&
              resort.formatted_policies.length > 0 && (
                <section className="relative">
                  <h2
                    className="text-2xl font-semibold text-gray-900 mb-0 italic relative z-10 pl-5 md:pl-4"
                    style={{ marginBottom: "-1rem" }}
                  >
                    Resort Info & Policies
                  </h2>
                  <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-100 rounded-2xl border border-gray-200 shadow px-5 md:px-4 py-6">
                    <div className="space-y-2">
                      {resort.formatted_policies.map((policy, index) => (
                        <div
                          key={index}
                          className="flex items-start text-sm text-gray-700"
                        >
                          <div className="w-2 h-2 bg-sky-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                          <span>{policy}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

            {resort.formatted_accessibility_notes &&
              resort.formatted_accessibility_notes.length > 0 && (
                <section className="relative">
                  <h2
                    className="text-2xl font-semibold text-gray-900 mb-0 italic relative z-10 pl-5 md:pl-4"
                    style={{ marginBottom: "-1rem" }}
                  >
                    Accessibility
                  </h2>
                  <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-100 rounded-2xl border border-gray-200 shadow px-5 md:px-4 py-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                      {resort.formatted_accessibility_notes.map(
                        (note, index) => (
                          <div key={index}>{renderAmenityItem(note)}</div>
                        ),
                      )}
                    </div>
                  </div>
                </section>
              )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Room Selection */}

            <section className="relative">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-0 italic relative z-10 pl-5 md:pl-4"
                style={{ marginBottom: "-1rem" }}
              >
                General Info
              </h2>
              <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-100 rounded-2xl border border-gray-200 shadow px-5 md:px-4 py-6">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-sky-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                    <span>
                      Unless otherwise specified under Resort Info & Policies,
                      minimum check-in age is 21.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-sky-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                    <span>
                      Bookings made through this offer are final, non-refundable
                      and non-transferrable. However, if for any reason you're
                      unable to travel, please let us know. Although we're
                      unable to get a refund from our travel partners for the
                      fees paid, we are more than happy to replace your voucher
                      free of charge.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-sky-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                    <span>
                      Please note that in very rare cases, some resorts may
                      charge for utilities. Fees may vary based on stay
                      duration, season, room size and actual usage. These
                      utility fees, if applicable, are not included in the total
                      booking price.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-sky-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                    <span>
                      Prior to travel, we recommend contacting your host resort
                      as well as local, state and federal websites for
                      advisories that may impact your travel or vacation
                      experience.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-sky-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                    <span>
                      Finally, please note that many resorts don’t pull guest
                      information from our partner's system until 2 weeks prior
                      to the checkin date. You��re welcome to call the resort to
                      confirm your reservation within two weeks of your checkin
                      date.
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>

        {/* Select Dates & Room - Full Width */}
        <section className="relative py-10 md:py-14 mt-8 md:mt-12">
          <div className="max-w-4xl mx-auto">
            <div
              className="h-px bg-gray-200/60 my-5 md:my-6"
              aria-hidden="true"
            ></div>
            <div
              className="mb-6 flex items-end justify-center text-3xl md:text-4xl"
              style={{
                // Reserve exactly two lines of space based on current font-size and a 1.2 line-height
                minHeight: "calc(2 * 1em * 1.2)",
                lineHeight: 1.2,
              }}
            >
              <h2
                className="font-bold text-center w-full"
                style={{
                  background: `linear-gradient(135deg, ${gradientColors.primary} 0%, ${gradientColors.secondary} 25%, ${gradientColors.tertiary} 75%, ${gradientColors.quaternary} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  lineHeight: 1.2,
                  paddingBottom: "0.55em",
                }}
              >
                {resort.resort_name}
              </h2>
            </div>

            <section className="relative">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-0 italic relative z-10 pl-5 md:pl-4"
                style={{ marginBottom: "-1rem" }}
              >
                Taxes & Fees
              </h2>
              <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-100 rounded-2xl border border-gray-200 shadow px-5 md:px-4 py-6">
                {minTaxesStr && maxTaxesStr ? (
                  <p className="text-sm text-gray-700 mb-3 text-justify">
                    As a reminder, your travel voucher covers your stay, but not
                    airfare, food, or the resort taxes & fees. The taxes & fees
                    at <em>{resort.resort_name}</em> range from{" "}
                    <strong>
                      {minTaxesStr}/night to {maxTaxesStr}/night
                    </strong>
                    , depending on the dates and room you select.{" "}
                    {minUpgradeStr ? (
                      <>
                        Upgrade fees start at{" "}
                        <strong>{minUpgradeStr}/night</strong>, and apply to
                        either upgraded rooms or to weeks that would not have
                        normally been available on our program.{" "}
                      </>
                    ) : null}
                    Taxes & fees and any upgrade fees are due at time of
                    booking.
                  </p>
                ) : (
                  <p className="text-sm text-gray-700 mb-3 text-justify">
                    As a reminder, your travel voucher covers your stay, but not
                    airfare, food, or the resort taxes & fees. The taxes & fees
                    at <em>{resort.resort_name}</em> vary depending on the dates
                    and room you select.{" "}
                    {minUpgradeStr ? (
                      <>
                        Upgrade fees start at{" "}
                        <strong>{minUpgradeStr}/night</strong>, and apply to
                        either upgraded rooms or to weeks that would not have
                        normally been available on our program.{" "}
                      </>
                    ) : null}
                    Taxes & fees and any upgrade fees are due at time of
                    booking.
                  </p>
                )}
                {(!resort.formatted_mandatory_fees ||
                  resort.formatted_mandatory_fees.length === 0) &&
                (!resort.formatted_other_fees ||
                  resort.formatted_other_fees.length === 0) ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-700 text-sm text-justify">
                      This resort doesn't charge a resort fee when booked
                      through this offer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700 text-justify font-bold">
                      The resort has made us aware that they also charge the
                      following fees onsite:
                    </p>
                    <ul className="space-y-2">
                      {[
                        ...(resort.formatted_mandatory_fees || []),
                        ...(resort.formatted_other_fees || []),
                      ].map((fee, index) => (
                        <li
                          key={index}
                          className="flex items-start text-sm text-gray-700"
                        >
                          <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                          <span className="block text-justify">
                            {fee.enhanced || fee.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {Object.keys(groupedBookings).length === 0 ? (
              <div className="py-8 text-center">
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                  <div className="mb-3 text-3xl">📅</div>
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    No Available Dates
                  </div>
                  <div className="text-sm text-gray-600">
                    Check back soon for more availability.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedBookings).map(([dateKey, slots]) => {
                  const getRoomTypeOrder = (roomType: string) => {
                    const roomTypeMap: Record<string, number> = {
                      Hotel: 0,
                      Studio: 1,
                      "1 Bedroom": 2,
                      "2 Bedroom": 3,
                      "3 Bedroom": 4,
                      "3+ Bedroom": 5,
                    };
                    return roomTypeMap[roomType] ?? 999;
                  };

                  const getKitchenTypeOrder = (kitchenType: string) => {
                    const kitchenTypeMap: Record<string, number> = {
                      "No Kitchen": 0,
                      "Mini Kitchen": 1,
                      "Mini-Kitchen": 1,
                      "Partial Kitchen": 2,
                      "Full Kitchen": 3,
                    };
                    return kitchenTypeMap[kitchenType] ?? 999;
                  };

                  const sortedSlots = [...slots].sort((a, b) => {
                    const roomTypeCompare =
                      getRoomTypeOrder(a.roomType) -
                      getRoomTypeOrder(b.roomType);
                    if (roomTypeCompare !== 0) return roomTypeCompare;
                    return (
                      getKitchenTypeOrder(a.kitchenType) -
                      getKitchenTypeOrder(b.kitchenType)
                    );
                  });

                  const firstSlot = sortedSlots[0];
                  const isDateSelected = sortedSlots.some(
                    (slot) => selectedBooking?.id === slot.id,
                  );
                  return (
                    <div key={dateKey} className="relative mt-8">
                      <div
                        className="relative z-10 w-fit ml-[16px] md:ml-[20px]"
                        style={{
                          marginBottom: "-1px",
                        }}
                      >
                        <div
                          className="flex items-end gap-2"
                          style={{ position: "relative", top: "md:hidden" }}
                        >
                          <h3
                            className="mb-0 font-light italic text-primary"
                            style={{
                              marginRight: "-1px",
                              marginBottom: "0",
                              fontSize: "28px",
                              fontWeight: "400",
                              lineHeight: "1",
                              position: "relative",
                              top: "-1px",
                            }}
                          >
                            {firstSlot.dates.split(" (")[0]}
                          </h3>
                          <div
                            className="font-light italic text-primary hidden md:block"
                            style={{
                              fontSize: "16px",
                              marginBottom: "2px",
                              position: "relative",
                              top: "3px",
                            }}
                          >
                            {(() => {
                              const dateStr = firstSlot.dates;
                              const match = dateStr.match(
                                /\((\w+)\s+to\s+(\w+)\)/,
                              );
                              if (match) {
                                return `${match[1]} to ${match[2]}`;
                              }
                              return "";
                            })()}
                          </div>
                          <div
                            className="font-light italic text-primary md:hidden"
                            style={{
                              fontSize: "16px",
                              position: "relative",
                              top: "4px",
                            }}
                          >
                            {(() => {
                              const dateStr = firstSlot.dates;
                              const match = dateStr.match(
                                /\((\w+)\s+to\s+(\w+)\)/,
                              );
                              if (match) {
                                return `${match[1].substring(0, 3)} to ${match[2].substring(0, 3)}`;
                              }
                              return "";
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200">
                        {sortedSlots.map((slot, index) => {
                          const isSelected = selectedBooking?.id === slot.id;
                          return (
                            <div key={slot.id} data-slot-id={slot.id}>
                              <div
                                onClick={() => {
                                  setSelectedBooking(slot);
                                  setIsDrawerOpen(true);
                                }}
                                className={`p-2.5 md:p-3.5 transition-all duration-200 cursor-pointer transform bg-primary/90 text-primary-foreground hover:bg-primary/95 ${
                                  appearingIds.has(slot.id)
                                    ? "animate-in fade-in zoom-in-95 ring-2 ring-primary/30"
                                    : ""
                                } ${
                                  disappearingIds.has(slot.id)
                                    ? "opacity-0 -translate-y-1"
                                    : ""
                                }`}
                              >
                                <div className="relative pl-[11px] md:pl-[15px] flex flex-col gap-1.5">
                                  {isSelected && (
                                    <div className="pointer-events-none absolute left-[-1px] top-1 bottom-[2px] w-[5px] bg-white rounded-full opacity-95" />
                                  )}
                                  <div>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="text-[15px] md:text-[18px] font-poppins font-bold text-primary-foreground">
                                          {/\bbedroom\b/i.test(
                                            slot.roomType || "",
                                          )
                                            ? `${slot.roomType} Suite`
                                            : `${slot.roomType} Room`}
                                        </div>
                                        <div className="text-[13px] md:text-[15px] text-primary-foreground/90">
                                          {slot.kitchenType}
                                        </div>
                                        <div className="text-xs md:text-sm text-primary-foreground/80">
                                          Sleeps {slot.sleeps}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="flex items-baseline justify-end">
                                          <div className="text-[15px] md:text-[18px] font-poppins font-bold text-primary-foreground whitespace-nowrap">
                                            ${Math.round(slot.taxesFees)}/night
                                          </div>
                                          <div className="ml-[3px] text-[11px] md:text-[12px] italic text-primary-foreground/90">
                                            taxes & fees
                                          </div>
                                        </div>
                                        {slot.upgradeFeesPerNight > 0 && (
                                          <div className="flex items-baseline justify-end -mt-0.5">
                                            <div className="text-[12px] md:text-[14px] font-poppins font-semibold text-primary-foreground whitespace-nowrap">
                                              +$
                                              {Math.round(
                                                slot.upgradeFeesPerNight,
                                              )}
                                              /night
                                            </div>
                                            <div className="ml-[3px] text-[11px] md:text-[12px] italic text-primary-foreground/90">
                                              upgrade fee
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {slot.onlineMeanNightlyPrice
                                      ? (() => {
                                          const savingsResult =
                                            calculateSavings(slot, resort!);
                                          if (
                                            typeof savingsResult === "string"
                                          ) {
                                            return (
                                              <div className="absolute right-0 bottom-0 translate-y-[2px] text-[10px] md:text-[11px] font-medium bg-white text-primary rounded-full px-1.5 py-px leading-tight shadow-sm">
                                                {savingsResult}
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className="absolute right-0 bottom-0 translate-y-[2px] text-[10px] md:text-[11px] font-medium bg-white text-primary rounded-full px-1.5 py-px leading-tight shadow-sm">
                                              {slot.totalNights}-NIGHT SAVINGS
                                              <span className="hidden md:inline">
                                                {" "}
                                                W/ VOUCHER
                                              </span>
                                              :{" "}
                                              <span className="font-poppins font-bold">
                                                $
                                                {Math.round(
                                                  savingsResult as number,
                                                ).toLocaleString("en-US")}
                                              </span>
                                            </div>
                                          );
                                        })()
                                      : null}
                                  </div>

                                  <div className="hidden">
                                    <div className="text-base md:text-lg font-bold text-primary-foreground">
                                      <span>{slot.roomType}</span>
                                      <span className="font-semibold text-primary-foreground/90">
                                        {" "}
                                        w/ {slot.kitchenType}
                                      </span>
                                      <span className="font-normal text-primary-foreground/80 text-xs md:text-base">
                                        {" "}
                                        (Sleeps {slot.sleeps})
                                      </span>
                                    </div>
                                    <div className="text-xs md:text-base mt-2 space-y-1">
                                      <div className="flex items-end gap-2">
                                        <span className="text-primary-foreground/90 font-normal">
                                          Taxes & fees
                                        </span>
                                        <div className="flex-1 border-b border-dotted border-gray-900 pb-0.5"></div>
                                        <span className="text-primary-foreground font-poppins font-bold whitespace-nowrap">
                                          ${Math.round(slot.taxesFees)}
                                          /night
                                        </span>
                                      </div>
                                      {slot.upgradeFeesPerNight > 0 && (
                                        <div
                                          className="flex items-end gap-2"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Popover
                                            open={openPopoverId === slot.id}
                                            onOpenChange={(open) =>
                                              setOpenPopoverId(
                                                open ? slot.id : null,
                                              )
                                            }
                                          >
                                            <PopoverTrigger asChild>
                                              <div className="flex items-center gap-1 relative z-50">
                                                <span className="text-primary-foreground/90 font-normal">
                                                  Upgrade fee
                                                </span>
                                                <button className="inline-flex cursor-pointer">
                                                  <Icon
                                                    name="circle-question"
                                                    style="regular"
                                                    size={16}
                                                    className="text-primary-foreground/90 hover:text-primary-foreground"
                                                  />
                                                </button>
                                              </div>
                                            </PopoverTrigger>
                                            <PopoverContent
                                              className="w-80 p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-xl z-50"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              sideOffset={8}
                                            >
                                              <p className="text-gray-700 leading-relaxed">
                                                Since this offer's made possible
                                                by helping resorts fill rooms
                                                that would've sat empty, the
                                                resorts make available those
                                                weeks they know won't fill up.
                                                Many resorts make extra weeks or
                                                larger suites available with
                                                upgrade fees. Some resorts only
                                                make dates available to us with
                                                upgrade fees. Even if you select
                                                an upgrade, our Savings
                                                Guarantee still applies! If you
                                                don't save at least $500
                                                compared to booking the same
                                                resort, room, and dates
                                                elsewhere, let us know and we'll
                                                give you a brand new voucher so
                                                you can take another trip! ����
                                              </p>
                                            </PopoverContent>
                                          </Popover>
                                          <div className="flex-1 border-b border-dotted border-gray-900 pb-0.5"></div>
                                          <span className="text-primary-foreground font-poppins font-bold whitespace-nowrap">
                                            + $
                                            {Math.round(
                                              slot.upgradeFeesPerNight,
                                            )}
                                            /night
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {slot.onlineMeanNightlyPrice
                                      ? (() => {
                                          const savingsResult =
                                            calculateSavings(slot, resort!);
                                          if (
                                            typeof savingsResult === "string"
                                          ) {
                                            return (
                                              <div className="text-xs md:text-base text-primary-foreground font-medium text-center mt-2">
                                                {savingsResult}
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className="text-xs md:text-base text-primary-foreground/90 font-normal mt-2 text-center">
                                              <span className="relative inline-block">
                                                <span
                                                  aria-hidden="true"
                                                  className="pointer-events-none absolute left-[-0.5em] right-[-0.5em] top-1/2 h-[0.16em] -translate-y-1/2 rounded-full blur-[2.5px] md:blur-[3.5px] z-0"
                                                  style={{
                                                    background:
                                                      "linear-gradient(to bottom, hsl(var(--primary)/0) 0%, hsl(var(--primary)/0.4) 20%, hsl(var(--primary)/0.85) 40%, hsl(var(--primary)/1) 50%, hsl(var(--primary)/0.85) 60%, hsl(var(--primary)/0.4) 80%, hsl(var(--primary)/0) 100%)",
                                                  }}
                                                />
                                                <span className="relative z-10">
                                                  {slot.totalNights}-NIGHT
                                                  SAVINGS
                                                  <span className="hidden md:inline">
                                                    {" "}
                                                    W/ VOUCHER
                                                  </span>
                                                  :{" "}
                                                </span>
                                                <span className="relative z-10 font-poppins font-bold">
                                                  $
                                                  {Math.round(
                                                    savingsResult as number,
                                                  ).toLocaleString("en-US")}
                                                </span>
                                              </span>
                                            </div>
                                          );
                                        })()
                                      : null}
                                  </div>
                                </div>
                              </div>
                              {index !== slots.length - 1 && (
                                <div className="h-0.5 bg-white" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Looking For More Dates - Bottom */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="border-sky-200 bg-sky-50">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon
                  name="info"
                  size={20}
                  color="text-gray-900"
                  className="mr-2"
                />
                Looking For More Dates?
              </h2>
              <p className="text-gray-700">
                Resorts release dates on a rolling basis, so keep checking back
                from time to time. Or you can try checking other resorts and
                destinations, as each resort is a little different in how far in
                advance they like to release dates.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Drawer for Booking Confirmation */}
        <Drawer
          open={isDrawerOpen && selectedBooking !== null}
          onOpenChange={(open) => setIsDrawerOpen(open)}
          modal={false}
        >
          <DrawerContent className="backdrop-blur-md bg-white/90 w-full left-0 right-0 rounded-none border-t border-gray-300 ring-0 shadow-none outline-none focus:outline-none focus:ring-0">
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1 rounded-full bg-gray-300"></div>
            </div>
            <DrawerHeader className="pb-2 px-5 pt-0 text-center sm:text-center">
              <DrawerTitle className="text-2xl font-bold break-words text-center">
                <span
                  style={{
                    background: `linear-gradient(135deg, ${gradientColors.primary} 0%, ${gradientColors.secondary} 25%, ${gradientColors.tertiary} 75%, ${gradientColors.quaternary} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {selectedBooking ? resort.resort_name : "Booking Selection"}
                </span>
                {selectedBooking && (
                  <span className="hidden md:inline text-gray-800 font-semibold">
                    <span className="mx-2 text-gray-300">|</span>
                    {selectedBooking.roomType} w/ {selectedBooking.kitchenType}{" "}
                    (Sleeps {selectedBooking.sleeps})
                    <span className="mx-2 text-gray-300">|</span>
                    {selectedBooking.drawerDates}
                  </span>
                )}
              </DrawerTitle>
            </DrawerHeader>
            {selectedBooking && (
              <div className="px-5 pb-5 space-y-3">
                <div className="space-y-0.5 md:hidden text-center">
                  <div className="text-base font-bold text-gray-900">
                    {selectedBooking.roomType} w/ {selectedBooking.kitchenType}{" "}
                    (Sleeps {selectedBooking.sleeps})
                  </div>
                  <div className="text-base font-bold text-gray-900">
                    {selectedBooking.drawerDates}
                  </div>
                </div>

                <div className="text-sm md:text-base mt-1 space-y-1">
                  <div className="flex items-end gap-2">
                    <span className="text-gray-700 font-normal">
                      Due now (
                      {selectedBooking.upgradeFeesPerNight > 0
                        ? "taxes, fees & upgrade"
                        : "taxes & fees"}
                      )
                    </span>
                    <div className="flex-1 border-b border-dotted border-gray-900 pb-0.5"></div>
                    <span className="text-gray-900 font-poppins font-bold whitespace-nowrap">
                      {formatCurrency(selectedBooking.price)}
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-gray-700 font-normal">
                      Due at Resort
                    </span>
                    <div className="flex-1 border-b border-dotted border-gray-900 pb-0.5"></div>
                    <span className="text-gray-900 font-poppins font-bold whitespace-nowrap">
                      {formatCurrency(
                        computeTotalMandatoryFees(selectedBooking, resort),
                      )}
                    </span>
                  </div>
                </div>

                {selectedBooking.onlineMeanNightlyPrice ? (
                  <div className="text-center">
                    <p className="text-xs text-gray-600">
                      As of our last price check, this same resort/room/dates
                      was booking at{" "}
                      <span className="font-poppins font-bold">
                        {formatCurrency(
                          selectedBooking.onlineMeanNightlyPrice *
                            selectedBooking.totalNights,
                        )}
                      </span>
                      . That's a final savings of{" "}
                      {typeof calculateSavings(
                        selectedBooking,
                        resort as ResortDetailsType,
                      ) === "number" ? (
                        <span className="font-poppins font-bold">
                          {formatCurrency(
                            calculateSavings(
                              selectedBooking,
                              resort as ResortDetailsType,
                            ) as number,
                          )}
                        </span>
                      ) : (
                        calculateSavings(
                          selectedBooking,
                          resort as ResortDetailsType,
                        )
                      )}
                      !
                    </p>
                  </div>
                ) : null}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setBookingSummaryOpen(true)}
                >
                  VIEW FULL BOOKING SUMMARY
                </Button>
              </div>
            )}
          </DrawerContent>
        </Drawer>

        {/* Booking Summary Dialog */}
        <Dialog open={bookingSummaryOpen} onOpenChange={setBookingSummaryOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Booking Summary</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div>
                  <h4
                    className="text-2xl font-bold break-words mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${gradientColors.primary} 0%, ${gradientColors.secondary} 25%, ${gradientColors.tertiary} 75%, ${gradientColors.quaternary} 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {resort.resort_name}
                  </h4>
                  <p className="text-base font-medium text-gray-900">
                    {selectedBooking.roomType} w/ {selectedBooking.kitchenType}{" "}
                    (Sleeps {selectedBooking.sleeps})
                  </p>
                  <div className="flex justify-between text-sm mt-2">
                    <span>Check-in:</span>
                    <span>
                      {new Date(selectedBooking.checkIn).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Check-out:</span>
                    <span>
                      {new Date(selectedBooking.checkOut).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Taxes & Fees:</span>
                    <span>
                      {selectedBooking.totalNights} ×{" "}
                      {formatCurrency(selectedBooking.taxesFees)} ={" "}
                      {formatCurrency(
                        selectedBooking.taxesFees * selectedBooking.totalNights,
                      )}
                    </span>
                  </div>
                  {selectedBooking.upgradeFeesPerNight > 0 && (
                    <div className="flex justify-between">
                      <span>Upgrade Fees:</span>
                      <span>
                        {selectedBooking.totalNights} ×{" "}
                        {formatCurrency(selectedBooking.upgradeFeesPerNight)} ={" "}
                        {formatCurrency(
                          selectedBooking.upgradeFeesPerNight *
                            selectedBooking.totalNights,
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-lg border-t pt-2">
                    <span>Total Due Now:</span>
                    <span>
                      {formatCurrency(calculateTotal(selectedBooking))}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) =>
                        setTermsAccepted(checked as boolean)
                      }
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-700">
                      I understand bookings are final, non-refundable, and
                      non-transferrable.
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="contact"
                      checked={contactAccepted}
                      onCheckedChange={(checked) =>
                        setContactAccepted(checked as boolean)
                      }
                    />
                    <Label htmlFor="contact" className="text-sm text-gray-700">
                      I understand I can't call the resort until 2 weeks before
                      check-in.
                    </Label>
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={!termsAccepted || !contactAccepted}
                  onClick={() => {
                    // In real app, redirect to checkout_link
                    alert("Redirecting to checkout...");
                  }}
                >
                  Book Now
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Lightbox Dialog */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-5xl p-0 border-0 bg-transparent shadow-none">
            <VisuallyHidden>
              <DialogTitle>Image Gallery</DialogTitle>
            </VisuallyHidden>
            <div
              className="aspect-[5/4] relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={images[currentImageIndex].url}
                alt={`${resort.resort_name} ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded text-sm">
                {currentImageIndex + 1} of {images.length}
              </div>
              {showOpenImageButton && images[currentImageIndex]?.notes && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded text-sm max-w-md text-center">
                  {images[currentImageIndex].notes}
                </div>
              )}
              {currentImageIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-12 h-12 md:w-14 md:h-14 shadow-sm"
                  onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                  aria-label="Previous image"
                >
                  <Icon name="chevron-left" size={28} color="text-gray-900" />
                </Button>
              )}
              {currentImageIndex < images.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-12 h-12 md:w-14 md:h-14 shadow-sm"
                  onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                  aria-label="Next image"
                >
                  <Icon name="chevron-right" size={28} color="text-gray-900" />
                </Button>
              )}
              {showOpenImageButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 left-4 bg-white/80 hover:bg-white text-black rounded w-12 h-12 flex items-center justify-center shadow-sm"
                  onClick={() =>
                    window.open(images[currentImageIndex].url, "_blank")
                  }
                  aria-label="Open image in new tab"
                >
                  <Icon name="up-right-from-square" size={20} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-white/80 hover:bg-white text-black rounded-full w-12 h-12 md:w-14 md:h-14 shadow-sm"
                onClick={() => setLightboxOpen(false)}
                aria-label="Close lightbox"
              >
                <Icon name="xmark" size={26} color="text-gray-900" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Backdrop overlay for popover */}
        {openPopoverId && (
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setOpenPopoverId(null)}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
