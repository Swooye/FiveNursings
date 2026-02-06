import React from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Tag } from "antd";

const { Title, Text } = Typography;

export const UserShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;

    return (
        <Show isLoading={isLoading}>
            <Title level={5}>ID</Title>
            <Text>{record?.id}</Text>

            <Title level={5}>姓名</Title>
            <Text>{record?.name || "未填写"}</Text>

            <Title level={5}>手机号</Title>
            <Text>{record?.phoneNumber}</Text>

            <Title level={5}>癌种</Title>
            <Tag color="red">{record?.cancerType}</Tag>

            <Title level={5}>康复评分</Title>
            <pre>{JSON.stringify(record?.scores, null, 2)}</pre>
        </Show>
    );
};
