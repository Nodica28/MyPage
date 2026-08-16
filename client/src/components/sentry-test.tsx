import React from "react";
import * as Sentry from "@sentry/react";

export function SentryTest() {
  const handleTestError = () => {
    // This will trigger an error that Sentry will capture
    throw new Error("Test error for Sentry integration");
  };

  const handleTestMessage = () => {
    // This will send a custom message to Sentry
    Sentry.captureMessage("Test message from Sentry integration", "info");
    alert("Test message sent to Sentry!");
  };

  const handleTestException = () => {
    // This will capture an exception manually
    try {
      throw new Error("Manual exception test");
    } catch (error) {
      Sentry.captureException(error);
      alert("Exception captured and sent to Sentry!");
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Sentry Integration Test</h3>
      <div className="space-y-2">
        <button
          onClick={handleTestError}
          className="block w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Trigger Test Error (will show error boundary)
        </button>
        <button
          onClick={handleTestMessage}
          className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send Test Message
        </button>
        <button
          onClick={handleTestException}
          className="block w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Capture Test Exception
        </button>
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Use these buttons to test your Sentry integration. Check your Sentry dashboard to see the events.
      </p>
    </div>
  );
}

