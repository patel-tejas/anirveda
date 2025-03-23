"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import Webcam from "react-webcam";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import axios from "axios";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [firebaseUrl, setFirebaseUrl] = useState("");
  const webcamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [loading, setLoading] = useState(false);

  // Camera initialization
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter(device => device.kind === "videoinput");

        if (videoDevices.length === 0) {
          throw new Error("No camera devices found");
        }

        setDevices(videoDevices);
        setActiveDeviceId(videoDevices[0].deviceId);
      } catch (err) {
        setCameraError(err.message || "Camera access failed");
      }
    };

    initializeCamera();
  }, []);

  const videoConstraints = {
    deviceId: activeDeviceId,
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 }
  };

  const handleCapture = async () => {
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Failed to capture image");

      // Set preview
      setCapturedImage(imageSrc);

      // Upload to Firebase
      const blob = await fetch(imageSrc).then(r => r.blob());
      const fileName = `registration-${Date.now()}-${username}.jpg`;
      const storageRef = ref(storage, `registrations/${fileName}`);
      const snapshot = await uploadBytesResumable(storageRef, blob);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      setFirebaseUrl(downloadUrl);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!firebaseUrl) throw new Error("Please capture an image first");
      if (!username || !password) throw new Error("Please fill in all fields");

      // Register with Python server
      await axios.post('http://localhost:8000/register', {
        username,
        password,
        image_url: firebaseUrl
      });

      console.log(username, password, firebaseUrl);
      
      // Save to MongoDB
      const response = await axios.post('/api/signup', {
        username,
        password,
        image_url: firebaseUrl,
        walletAddress: "0x9994" // Mock wallet address
      });

      window.location.href = '/dashboard';
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center py-24 px-4 sm:px-6 lg:px-8 hero-pattern">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-fintech-black-800 bg-black/50 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-white">
              Sign Up
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-white">
            <form onSubmit={handleSignUp}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    className="text-black"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="text-black"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Face Verification</Label>

                  {devices.length > 1 && (
                    <select
                      value={activeDeviceId}
                      onChange={(e) => setActiveDeviceId(e.target.value)}
                      className="mb-2 w-full text-black"
                    >
                      {devices.map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          Camera {index + 1}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    {activeDeviceId ? (
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={videoConstraints}
                        className="absolute top-0 left-0 w-full h-full object-cover"
                        mirrored
                        onUserMedia={() => setCameraReady(true)}
                        onUserMediaError={() => setCameraError("Camera access error")}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full p-4">
                        <p className="text-gray-400 text-center">
                          {cameraError || "Initializing camera..."}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={handleCapture}
                      disabled={!cameraReady}
                    >
                      Capture Image
                    </Button>

                    {capturedImage && (
                      <div className="mt-2">
                        <p className="text-sm mb-2">Captured Preview:</p>
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="rounded-lg border border-gray-600"
                        />
                      </div>
                    )}

                    {firebaseUrl && (
                      <div className="mt-2">
                        <p className="text-sm">Stored at:</p>
                        <a
                          href={firebaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline break-all text-xs"
                        >
                          {firebaseUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              onClick={handleSignUp}
              disabled={loading || !firebaseUrl}
            >
              {loading ? "Registering..." : "Complete Sign Up"}
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}