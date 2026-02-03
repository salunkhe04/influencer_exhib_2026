"use client";
import fetchAdapter from "@/adapter/fetchAdapter";
import React, { useState } from "react";

type DataProviderProps = {
  children: React.ReactNode;
};
type DataProviderState = {
  loading: boolean;
  currentTask: ExihibitionVideoModel | null;
  videoCount: ExihibitionVideoCountModel | null;

  addExhibitionVideo: (
    data: Record<string, any>
  ) => Promise<{ success: boolean; message?: string }>;
  getVideoCount: () => Promise<{ success: boolean; message?: string }>;
};

const initialState: DataProviderState = {
  loading: false,
  currentTask: null,

  videoCount: null,
  addExhibitionVideo: async () => ({
    success: false,
    message: "Not initialized",
  }),

  getVideoCount: async () => ({ success: false, message: "Not initialized" }),
};
const dataProviderContext =
  React.createContext<DataProviderState>(initialState);
export function DataProvider({ children, ...props }: DataProviderProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<ExihibitionVideoModel | null>(
    null
  );

  const [videoCount, setVideoCount] =
    useState<ExihibitionVideoCountModel | null>(null);

  const [error, setError] = useState("");

  const addExhibitionVideo = async (
    data: Record<string, any>
  ): Promise<{
    success: boolean;
    message?: string;
    data?: ExihibitionVideoModel | null;
  }> => {
    console.log("here`");
    setLoading(true);
    setError("");
    console.log("here");
    try {
      const url = `/api/add-exhibition-video`;

      console.log("here1");

      const res = await fetchAdapter(url, {
        method: "POST",
        body: JSON.stringify(data),
      });

      console.log(res);
      const otp = res?.data;

      console.log("otp", otp);
      setCurrentTask(otp);

      return { success: true, data: otp };
    } catch (error: any) {
      console.error(error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch task";

      setError(message);

      return { success: false, message, data: null };
    } finally {
      setLoading(false);
    }
  };

  const getVideoCount = async () => {
    setLoading(true);
    setError("");

    try {
      const url = `/api/exhibition-video-count`;
      const res = await fetchAdapter(url, {
        method: "get",
      });

      // console.log(res?.data);
      setVideoCount(res?.data?.[0] ?? null);

      setLoading(false);

      return { success: true };
    } catch (err: any) {
      // console.log(err);
      setError(err.message);
      setLoading(false);

      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  
  const value = {
    loading: loading,
    currentTask: currentTask,
    videoCount: videoCount,

    addExhibitionVideo: addExhibitionVideo,
    getVideoCount: getVideoCount,
  };

  return (
    <dataProviderContext.Provider {...props} value={value}>
      {children}
    </dataProviderContext.Provider>
  );
}

export const useData = () => {
  const context = React.useContext(dataProviderContext);

  if (context === undefined)
    throw new Error("useData must be used within a DataProvider");

  return context;
};
