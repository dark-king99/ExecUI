import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("UI ERROR:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-300 bg-red-50 p-6">
          <h3 className="font-semibold text-red-700">
            Something went wrong in this section
          </h3>
          <p className="text-sm text-red-600 mt-1">
            This feature failed safely without crashing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
