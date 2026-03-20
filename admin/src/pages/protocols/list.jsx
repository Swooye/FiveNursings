import React from "react";
import { List, useTable, EditButton } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";

export const ProtocolList = () => {
    const { tableProps } = useTable({
        resource: "protocols"
    });

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column 
                    dataIndex="title" 
                    title="协议标题" 
                    render={(value) => <span style={{ fontWeight: "bold" }}>{value}</span>}
                />
                <Table.Column 
                    dataIndex="key" 
                    title="标识符"
                    render={(value) => <Tag color="blue">{value}</Tag>} 
                />
                <Table.Column 
                    dataIndex="updatedAt" 
                    title="最后更新"
                    render={(value) => value ? new Date(value).toLocaleString() : '-'} 
                />
                <Table.Column 
                    title="操作"
                    render={(_, record) => (
                        <Space>
                            <EditButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
