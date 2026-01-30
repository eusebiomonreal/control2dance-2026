<?php
/**
 * Plugin Name: EDD Data Exporter for Control2Dance (v2)
 * Description: Exporta todos los datos de Easy Digital Downloads incluyendo IDs de transacción
 * Version: 2.0.0
 * Author: Control2Dance
 */

// ... (existing code but modified export_orders)

// I will only provide the modified part or the whole file if preferred.
// Let's provide the whole file for convenience.

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V2 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v2', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v2', 'EDD Export v2', 'manage_options', 'edd-data-exporter-v2', [$this, 'admin_page'], 'dashicons-download', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>📦 Exportar Datos de EDD (v2 con IDs de Transacción)</h1>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v2">
                <?php wp_nonce_field('export_edd_data_v2', 'export_nonce'); ?>
                <?php submit_button('🚀 Exportar con IDs de Transacción'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v2', 'export_nonce');
        
        $export_data = [
            'exported_at' => current_time('mysql'),
            'orders' => $this->export_orders(),
        ];
        
        $json = json_encode($export_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-export-v2-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function export_orders() {
        global $wpdb;
        $data = [];
        
        // Determinar versión de EDD
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}edd_orders'");
        
        if ($table_exists) {
            $orders = $wpdb->get_results("SELECT o.*, c.email as c_email FROM {$wpdb->prefix}edd_orders o LEFT JOIN {$wpdb->prefix}edd_customers c ON o.customer_id = c.id ORDER BY o.id DESC");
            foreach ($orders as $order) {
                // BUG FIX: Intentar obtener transaction_id desde META si está vacío en la tabla
                $transaction_id = $order->transaction_id;
                if (empty($transaction_id)) {
                    // En EDD 3.x el ID de pago de WP suele estar en edd_orders.id si se migró, o buscamos en meta
                    $transaction_id = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = '_edd_payment_transaction_id'", $order->id));
                }
                
                $data[] = [
                    'order_number' => $order->order_number,
                    'customer_email' => $order->c_email,
                    'payment_method' => $order->gateway,
                    'transaction_id' => $transaction_id,
                ];
            }
        } else {
            // Versión Antigua (2.x)
            $orders = get_posts(['post_type' => 'edd_payment', 'posts_per_page' => -1, 'post_status' => 'any']);
            foreach ($orders as $order) {
                $data[] = [
                    'order_number' => get_post_meta($order->ID, '_edd_payment_number', true),
                    'customer_email' => get_post_meta($order->ID, '_edd_payment_user_email', true),
                    'payment_method' => get_post_meta($order->ID, '_edd_payment_gateway', true),
                    'transaction_id' => get_post_meta($order->ID, '_edd_payment_transaction_id', true),
                ];
            }
        }
        return $data;
    }
}
new EDD_Data_Exporter_V2();
