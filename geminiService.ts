
import { GoogleGenAI, Type } from "@google/genai";
import { Driver, Passenger, Location } from "./types";

export interface OptimizedItinerary {
  steps: {
    passengerId: string;
    passengerName: string;
    action: 'pickup';
    reason: string;
    sequence: number;
    estimatedDistance: string;
  }[];
  explanation: string;
  totalDistanceKm: string;
}

export async function getOptimizedRoute(
  driver: Driver,
  pendingPassengers: Passenger[]
): Promise<OptimizedItinerary | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Bạn là một chuyên gia điều phối giao thông thông minh cho tuyến Quảng Nam (QN) - Đà Nẵng (DN).
    
    BỐI CẢNH: 
    - Tài xế đang ở vị trí: ${JSON.stringify(driver.currentLocation)}
    - Hướng di chuyển: ${driver.direction === 'QN-DN' ? 'Quảng Nam ra Đà Nẵng' : 'Đà Nẵng về Quảng Nam'}
    - Xe còn trống: ${driver.seats.filter(s => !s.passenger).length} chỗ.

    DANH SÁCH KHÁCH ĐANG CHỜ (TỌA ĐỘ LAT/LNG):
    ${JSON.stringify(pendingPassengers.map(p => ({
      id: p.id,
      name: p.name,
      location: p.pickupLocation,
      time: p.pickupTime,
      notes: p.notes
    })))}

    NHIỆM VỤ:
    1. Chọn ra các hành khách TỐI ƯU NHẤT để lấp đầy số ghế trống (tối đa ${driver.seats.filter(s => !s.passenger).length} người).
    2. Ưu tiên khách GẦN vị trí tài xế nhất và nằm trên TRỤC ĐƯỜNG di chuyển chính.
    3. Sắp xếp THỨ TỰ đón (sequence 1, 2, 3...) sao cho tài xế không phải đi ngược đường.

    YÊU CẦU ĐẦU RA: Trả về JSON theo đúng schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  passengerId: { type: Type.STRING },
                  passengerName: { type: Type.STRING },
                  action: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  sequence: { type: Type.NUMBER },
                  estimatedDistance: { type: Type.STRING }
                },
                required: ["passengerId", "passengerName", "action", "reason", "sequence"]
              }
            },
            explanation: { type: Type.STRING },
            totalDistanceKm: { type: Type.STRING }
          },
          required: ["steps", "explanation", "totalDistanceKm"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Optimization failed:", error);
    return null;
  }
}

export async function geocodeLocation(address: string): Promise<Location | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Tìm tọa độ chính xác (latitude và longitude) cho địa chỉ sau tại khu vực Quảng Nam hoặc Đà Nẵng, Việt Nam: "${address}".
    Nếu địa chỉ không rõ ràng, hãy trả về tọa độ trung tâm nhất của khu vực đó.
    Trả về kết quả dưới dạng JSON với định dạng: {"lat": số, "lng": số, "name": "tên địa danh cụ thể"}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            name: { type: Type.STRING }
          },
          required: ["lat", "lng", "name"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Xác định tên địa chỉ/địa danh ngắn gọn cho tọa độ lat: ${lat}, lng: ${lng} tại Quảng Nam/Đà Nẵng. Trả về duy nhất 1 chuỗi văn bản là tên địa chỉ.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    return `Vị trí tại ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
