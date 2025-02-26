import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

// Configurations for the resources
const config = new pulumi.Config();
const resourceGroupName = "myResourceGroup";
const region = "East US";

// Create Resource Group
const resourceGroup = new azure.resources.ResourceGroup(resourceGroupName, {
    location: region,
});

// Create the AKS Cluster
const aksCluster = new azure.containerservice.ManagedCluster("myAksCluster", {
    resourceGroupName: resourceGroup.name,
    location: region,
    kubernetesVersion: "1.21.2", // Choose the desired Kubernetes version
    dnsPrefix: "akscluster",
    agentPoolProfiles: [{
        name: "default",
        count: 3,
        vmSize: "Standard_DS2_v2",
        osType: "Linux",
    }],
    enableRBAC: true,
    networkProfile: {
        networkPlugin: "azure", // Use Azure CNI networking
        networkPolicy: "calico", // You can choose the policy like calico for network security
    },
    identity: {
        type: "SystemAssigned", // AKS system-assigned identity
    },
});

// Create the Application Gateway with WAF
const appGateway = new azure.network.ApplicationGateway("myAppGateway", {
    resourceGroupName: resourceGroup.name,
    location: region,
    sku: {
        name: "WAF_v2",
        tier: "WAF",
    },
    gatewayIPConfigurations: [{
        name: "appGwIpConfig",
        subnet: {
            id: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}/subnets/{subnetName}",
        },
    }],
    frontendIPConfigurations: [{
        name: "appGwFrontendIP",
        publicIPAddress: {
            id: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/publicIPAddresses/{publicIPName}",
        },
    }],
    frontendPorts: [{
        name: "appGwFrontendPort",
        port: 80,
    }],
    backendAddressPools: [{
        name: "appGwBackendPool",
        backendAddresses: [
            { ipAddress: "10.0.0.1" }, // Use AKS Node IP addresses or internal load balancer IPs
        ],
    }],
    backendHttpSettingsCollection: [{
        name: "appGwBackendHttpSettings",
        port: 80,
        protocol: "Http",
    }],
    httpListeners: [{
        name: "appGwHttpListener",
        frontendIPConfiguration: {
            id: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/applicationGateways/{appGwName}/frontendIPConfigurations/{frontendIPName}",
        },
        frontendPort: {
            id: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/applicationGateways/{appGwName}/frontendPorts/{frontendPortName}",
        },
        protocol: "Http",
    }],
    urlPathMaps: [{
        name: "appGwUrlPathMap",
        defaultBackendAddressPool: {
            id: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/applicationGateways/{appGwName}/backendAddressPools/{backendPoolName}",
        },
        defaultBackendHttpSettings: {
            id: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/applicationGateways/{appGwName}/backendHttpSettingsCollection/{httpSettingsName}",
        },
    }],
});

// Create Public IP for the Application Gateway
const publicIP = new azure.network.PublicIPAddress("myPublicIP", {
    resourceGroupName: resourceGroup.name,
    location: region,
    publicIPAllocationMethod: "Dynamic",
    sku: {
        name: "Standard",
    },
});

// Export the URL of the AKS cluster and Public IP of the Application Gateway
export const aksClusterName = aksCluster.name;
export const appGatewayPublicIP = publicIP.ipAddress;
