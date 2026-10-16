import { useState } from "react";
import { SplitPane } from "@/components/ui/SplitPane";
import type { Tab } from "@/store/workspace";
import { GrpcRequestEditor } from "./grpc/GrpcRequestEditor";
import { HttpRequestEditor } from "./http/HttpRequestEditor";
import { ResponsePanel } from "./response/ResponsePanel";

export function RequestPane({ tab }: { tab: Tab }) {
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");

  const editor =
    tab.request.kind === "http" ? (
      <HttpRequestEditor key={tab.id} tab={tab} request={tab.request} />
    ) : (
      <GrpcRequestEditor key={tab.id} tab={tab} request={tab.request} />
    );

  return (
    <SplitPane
      key={layout}
      direction={layout}
      initial={0.5}
      className="flex-1"
      first={editor}
      second={
        <ResponsePanel
          tabId={tab.id}
          layout={layout}
          onToggleLayout={() => setLayout(layout === "vertical" ? "horizontal" : "vertical")}
        />
      }
    />
  );
}
